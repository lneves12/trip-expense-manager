
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { Trip, CreateTripInput, Currency } from '../../../server/src/schema';

interface TripFormProps {
  onTripCreated: (trip: Trip) => void;
}

export function TripForm({ onTripCreated }: TripFormProps) {
  const [formData, setFormData] = useState<CreateTripInput>({
    name: '',
    description: null,
    currency: 'EUR'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newTrip = await trpc.createTrip.mutate(formData);
      onTripCreated(newTrip);
      setFormData({
        name: '',
        description: null,
        currency: 'EUR'
      });
    } catch (error) {
      console.error('Failed to create trip:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Trip Name</Label>
        <Input
          id="name"
          placeholder="e.g., Weekend in Paris"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateTripInput) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Tell us about your trip..."
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateTripInput) => ({
              ...prev,
              description: e.target.value || null
            }))
          }
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Select
          value={formData.currency || 'EUR'}
          onValueChange={(value: Currency) =>
            setFormData((prev: CreateTripInput) => ({ ...prev, currency: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">🇪🇺 Euro (EUR)</SelectItem>
            <SelectItem value="USD">🇺🇸 US Dollar (USD)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Creating...' : '✈️ Create Trip'}
      </Button>
    </form>
  );
}
