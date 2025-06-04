
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Expense, CreateExpenseInput, Participant, SplitType } from '../../../server/src/schema';

interface ExpenseFormProps {
  tripId: number;
  participants: Participant[];
  currency: string;
  onExpenseAdded: (expense: Expense) => void;
}

export function ExpenseForm({ tripId, participants, currency, onExpenseAdded }: ExpenseFormProps) {
  const [formData, setFormData] = useState<CreateExpenseInput>({
    trip_id: tripId,
    paid_by_participant_id: 0,
    description: '',
    amount: 0,
    split_type: 'EQUAL',
    splits: []
  });
  const [isLoading, setIsLoading] = useState(false);

  const getCurrencySymbol = (currency: string) => {
    return currency === 'EUR' ? '€' : '$';
  };

  const handleSplitTypeChange = (splitType: SplitType) => {
    setFormData((prev: CreateExpenseInput) => ({
      ...prev,
      split_type: splitType,
      splits: participants.map(p => ({
        participant_id: p.id,
        amount: splitType === 'EQUAL' ? prev.amount / participants.length : undefined,
        percentage: splitType === 'PERCENTAGE' ? 100 / participants.length : undefined
      }))
    }));
  };

  const handleSplitChange = (participantId: number, field: 'amount' | 'percentage', value: number) => {
    setFormData((prev: CreateExpenseInput) => ({
      ...prev,
      splits: prev.splits.map(split =>
        split.participant_id === participantId
          ? { ...split, [field]: value }
          : split
      )
    }));
  };

  const handleParticipantToggle = (participantId: number, checked: boolean) => {
    if (checked) {
      const newSplit = {
        participant_id: participantId,
        amount: formData.split_type === 'CUSTOM' ? 0 : formData.amount / (formData.splits.length + 1),
        percentage: formData.split_type === 'PERCENTAGE' ? 100 / (formData.splits.length + 1) : undefined
      };
      setFormData((prev: CreateExpenseInput) => ({
        ...prev,
        splits: [...prev.splits, newSplit]
      }));
    } else {
      setFormData((prev: CreateExpenseInput) => ({
        ...prev,
        splits: prev.splits.filter(split => split.participant_id !== participantId)
      }));
    }
  };

  const recalculateEqualSplits = (amount: number) => {
    if (formData.split_type === 'EQUAL' && formData.splits.length > 0) {
      const amountPerPerson = amount / formData.splits.length;
      setFormData((prev: CreateExpenseInput) => ({
        ...prev,
        splits: prev.splits.map(split => ({
          ...split,
          amount: amountPerPerson
        }))
      }));
    }
  };

  const handleAmountChange = (amount: number) => {
    setFormData((prev: CreateExpenseInput) => ({ ...prev, amount }));
    recalculateEqualSplits(amount);
  };

  const validateForm = (): boolean => {
    if (!formData.description || !formData.amount || !formData.paid_by_participant_id) {
      return false;
    }
    if (formData.splits.length === 0) {
      return false;
    }
    if (formData.split_type === 'PERCENTAGE') {
      const totalPercentage = formData.splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
      return Math.abs(totalPercentage - 100) < 0.01;
    }
    if (formData.split_type === 'CUSTOM') {
      const totalAmount = formData.splits.reduce((sum, split) => sum + (split.amount || 0), 0);
      return Math.abs(totalAmount - formData.amount) < 0.01;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('Please check your split values - they must add up correctly!');
      return;
    }

    setIsLoading(true);
    try {
      const newExpense = await trpc.createExpense.mutate(formData);
      onExpenseAdded(newExpense);
      setFormData({
        trip_id: tripId,
        paid_by_participant_id: 0,
        description: '',
        amount: 0,
        split_type: 'EQUAL',
        splits: []
      });
    } catch (error) {
      console.error('Failed to create expense:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="e.g., Dinner at restaurant"
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateExpenseInput) => ({ ...prev, description: e.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount ({getCurrencySymbol(currency)})</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.amount || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleAmountChange(parseFloat(e.target.value) || 0)
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payer">Paid by</Label>
          <Select
            value={formData.paid_by_participant_id ? formData.paid_by_participant_id.toString() : ''}
            onValueChange={(value: string) =>
              setFormData((prev: CreateExpenseInput) => ({ ...prev, paid_by_participant_id: parseInt(value) }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select who paid" />
            </SelectTrigger>
            <SelectContent>
              {participants.map((participant: Participant) => (
                <SelectItem key={participant.id} value={participant.id.toString()}>
                  {participant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Split Type</Label>
          <Select
            value={formData.split_type || 'EQUAL'}
            onValueChange={(value: SplitType) => handleSplitTypeChange(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EQUAL">⚖️ Split Equally</SelectItem>
              <SelectItem value="PERCENTAGE">📊 By Percentage</SelectItem>
              <SelectItem value="CUSTOM">✏️ Custom Amounts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Split Details</CardTitle>
          <CardDescription>
            {formData.split_type === 'EQUAL' && 'Amount will be split equally among selected participants'}
            {formData.split_type === 'PERCENTAGE' && 'Percentages must add up to 100%'}
            {formData.split_type === 'CUSTOM' && `Custom amounts must add up to ${getCurrencySymbol(currency)}${formData.amount}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {participants.map((participant: Participant) => {
            const split = formData.splits.find(s => s.participant_id === participant.id);
            const isSelected = !!split;

            return (
              <div key={participant.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked: boolean) => handleParticipantToggle(participant.id, checked)}
                />
                <div className="flex-1">
                  <span className="font-medium">{participant.name}</span>
                </div>
                {isSelected && (
                  <div className="flex items-center space-x-2">
                    {formData.split_type === 'PERCENTAGE' && (
                      <div className="flex items-center space-x-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={split?.percentage || 0}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleSplitChange(participant.id, 'percentage', parseFloat(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    )}
                    {formData.split_type === 'CUSTOM' && (
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-500">{getCurrencySymbol(currency)}</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={split?.amount || 0}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleSplitChange(participant.id, 'amount', parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </div>
                    )}
                    {formData.split_type === 'EQUAL' && (
                      <Badge variant="secondary">
                        {getCurrencySymbol(currency)}{(split?.amount || 0).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {formData.splits.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span className="font-medium">
                  {formData.split_type === 'PERCENTAGE' ? (
                    `${formData.splits.reduce((sum, split) => sum + (split.percentage || 0), 0).toFixed(1)}%`
                  ) : (
                    `${getCurrencySymbol(currency)}${formData.splits.reduce((sum, split) => sum + (split.amount || 0), 0).toFixed(2)}`
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading || !validateForm()} className="w-full">
        {isLoading ? 'Adding...' : '💰 Add Expense'}
      </Button>
    </form>
  );
}
