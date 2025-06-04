
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { Participant, CreateParticipantInput } from '../../../server/src/schema';

interface ParticipantFormProps {
  tripId: number;
  onParticipantAdded: (participant: Participant) => void;
}

export function ParticipantForm({ tripId, onParticipantAdded }: ParticipantFormProps) {
  const [formData, setFormData] = useState<CreateParticipantInput>({
    trip_id: tripId,
    name: '',
    email: null
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newParticipant = await trpc.createParticipant.mutate(formData);
      onParticipantAdded(newParticipant);
      setFormData({
        trip_id: tripId,
        name: '',
        email: null
      });
    } catch (error) {
      console.error('Failed to add participant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="e.g., John Doe"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateParticipantInput) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={formData.email || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateParticipantInput) => ({
              ...prev,
              email: e.target.value || null
            }))
          }
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Adding...' : '👤 Add Participant'}
      </Button>
    </form>
  );
}
