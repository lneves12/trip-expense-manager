
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PlusIcon, UsersIcon, ReceiptIcon, ScaleIcon, Trash2Icon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { TripForm } from '@/components/TripForm';
import { ParticipantForm } from '@/components/ParticipantForm';
import { ExpenseForm } from '@/components/ExpenseForm';
import { BalanceView } from '@/components/BalanceView';
import type { Trip, Participant, Expense, TripBalances } from '../../server/src/schema';

function App() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<TripBalances | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      const result = await trpc.getTrips.query();
      setTrips(result);
    } catch (error) {
      console.error('Failed to load trips:', error);
    }
  }, []);

  const loadTripData = useCallback(async (tripId: number) => {
    setIsLoading(true);
    try {
      const [participantsResult, expensesResult, balancesResult] = await Promise.all([
        trpc.getTripParticipants.query(tripId),
        trpc.getTripExpenses.query(tripId),
        trpc.getTripBalances.query(tripId)
      ]);
      setParticipants(participantsResult);
      setExpenses(expensesResult);
      setBalances(balancesResult);
    } catch (error) {
      console.error('Failed to load trip data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    if (selectedTrip) {
      loadTripData(selectedTrip.id);
    }
  }, [selectedTrip, loadTripData]);

  const handleTripCreated = (newTrip: Trip) => {
    setTrips((prev: Trip[]) => [...prev, newTrip]);
    setSelectedTrip(newTrip);
  };

  const handleParticipantAdded = (newParticipant: Participant) => {
    setParticipants((prev: Participant[]) => [...prev, newParticipant]);
  };

  const handleExpenseAdded = (newExpense: Expense) => {
    setExpenses((prev: Expense[]) => [...prev, newExpense]);
    // Reload balances when expense is added
    if (selectedTrip) {
      loadTripData(selectedTrip.id);
    }
  };

  const handleDeleteTrip = async (id: number) => {
    try {
      await trpc.deleteTrip.mutate(id);
      setTrips((prev) => prev.filter((trip) => trip.id !== id));
      if (selectedTrip?.id === id) {
        setSelectedTrip(null); // Deselect trip if the current one is deleted
      }
    } catch (error) {
      console.error('Failed to delete trip:', error);
    }
  };

  const handleDeleteParticipant = async (id: number) => {
    try {
      await trpc.deleteParticipant.mutate(id);
      // Reload trip data to get updated participant list and balances
      if (selectedTrip) {
        await loadTripData(selectedTrip.id);
      }
    } catch (error) {
      console.error('Failed to delete participant:', error);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await trpc.deleteExpense.mutate(id);
      // Reload trip data to get updated expense list and balances
      if (selectedTrip) {
        await loadTripData(selectedTrip.id);
      }
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    return currency === 'EUR' ? '€' : '$';
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${amount.toFixed(2)}`;
  };

  if (!selectedTrip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 TripSplit</h1>
            <p className="text-gray-600">Manage shared expenses for your trips</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusIcon className="w-5 h-5" />
                  Create New Trip
                </CardTitle>
                <CardDescription>
                  Start by creating a new trip to track expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TripForm onTripCreated={handleTripCreated} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Trips</CardTitle>
                <CardDescription>
                  {trips.length === 0 ? 'No trips yet' : `${trips.length} trip${trips.length === 1 ? '' : 's'}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trips.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    🚀 Create your first trip to get started!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {trips.map((trip: Trip) => (
                      <div
                        key={trip.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div onClick={() => setSelectedTrip(trip)} className="flex-grow">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{trip.name}</h3>
                              {trip.description && (
                                <p className="text-sm text-gray-600">{trip.description}</p>
                              )}
                            </div>
                            <Badge variant="outline">{trip.currency}</Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Created {trip.created_at.toLocaleDateString()}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 ml-2">
                              <Trash2Icon className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your
                                "{trip.name}" trip and all associated participants, expenses, and splits.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTrip(trip.id)}>
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => setSelectedTrip(null)}
                className="mb-2"
              >
                ← Back to Trips
              </Button>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                ✈️ {selectedTrip.name}
                <Badge variant="outline" className="text-sm">
                  {selectedTrip.currency}
                </Badge>
              </h1>
              {selectedTrip.description && (
                <p className="text-gray-600 mt-1">{selectedTrip.description}</p>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <ScaleIcon className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Participants ({participants.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <ReceiptIcon className="w-4 h-4" />
              Expenses ({expenses.length})
            </TabsTrigger>
            <TabsTrigger value="balances" className="flex items-center gap-2">
              <ScaleIcon className="w-4 h-4" />
              Balances
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <UsersIcon className="w-5 h-5" />
                      Participants
                    </span>
                    <Badge variant="secondary">{participants.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {participants.length === 0 ? (
                    <p className="text-gray-500 text-sm">No participants yet</p>
                  ) : (
                    <div className="space-y-2">
                      {participants.slice(0, 3).map((participant: Participant) => (
                        <div key={participant.id} className="text-sm">
                          {participant.name}
                        </div>
                      ))}
                      {participants.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{participants.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ReceiptIcon className="w-5 h-5" />
                      Expenses
                    </span>
                    <Badge variant="secondary">{expenses.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expenses.length === 0 ? (
                    <p className="text-gray-500 text-sm">No expenses yet</p>
                  ) : (
                    <div className="space-y-2">
                      {expenses.slice(0, 3).map((expense: Expense) => (
                        <div key={expense.id} className="text-sm flex justify-between">
                          <span>{expense.description}</span>
                          <span className="font-medium">
                            {formatAmount(expense.amount, selectedTrip.currency)}
                          </span>
                        </div>
                      ))}
                      {expenses.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{expenses.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <ScaleIcon className="w-5 h-5" />
                    Total Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatAmount(
                      expenses.reduce((sum, expense) => sum + expense.amount, 0),
                      selectedTrip.currency
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Across {expenses.length} expense{expenses.length === 1 ? '' : 's'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Get started with your trip management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {participants.length === 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-blue-800 font-medium">👥 Add participants first</p>
                    <p className="text-blue-600 text-sm mt-1">
                      Start by adding people to your trip in the Participants tab
                    </p>
                  </div>
                )}
                {participants.length > 0 && expenses.length === 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-800 font-medium">💰 Ready to add expenses</p>
                    <p className="text-green-600 text-sm mt-1">
                      Your participants are set up. Now you can start adding expenses!
                    </p>
                  </div>
                )}
                {participants.length > 0 && expenses.length > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-purple-800 font-medium">📊 Check balances</p>
                    <p className="text-purple-600 text-sm mt-1">
                      View who owes what in the Balances tab
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add Participant</CardTitle>
                  <CardDescription>
                    Add people to your trip to split expenses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ParticipantForm
                    tripId={selectedTrip.id}
                    onParticipantAdded={handleParticipantAdded}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Participants ({participants.length})</CardTitle>
                  <CardDescription>
                    People in this trip
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {participants.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      👥 Add your first participant to get started!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {participants.map((participant: Participant) => (
                        <div key={participant.id} className="p-3 border rounded-lg flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{participant.name}</h3>
                            {participant.email && (
                              <p className="text-sm text-gray-600">{participant.email}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              Added {participant.created_at.toLocaleDateString()}
                            </p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 ml-2">
                                <Trash2Icon className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete "{participant.name}"
                                  and all expenses they paid or were involved in splitting.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteParticipant(participant.id)}>
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add Expense</CardTitle>
                  <CardDescription>
                    Record a new expense for this trip
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {participants.length === 0 ? (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-yellow-800 font-medium">⚠️ No participants yet</p>
                      <p className="text-yellow-600 text-sm mt-1">
                        Add participants first before creating expenses
                      </p>
                    </div>
                  ) : (
                    <ExpenseForm
                      tripId={selectedTrip.id}
                      participants={participants}
                      currency={selectedTrip.currency}
                      onExpenseAdded={handleExpenseAdded}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expenses ({expenses.length})</CardTitle>
                  <CardDescription>
                    Total: {formatAmount(
                      expenses.reduce((sum, expense) => sum + expense.amount, 0),
                      selectedTrip.currency
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {expenses.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      💰 Add your first expense to start tracking!
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {expenses.map((expense: Expense) => {
                        const payer = participants.find(p => p.id === expense.paid_by_participant_id);
                        return (
                          <div key={expense.id} className="p-3 border rounded-lg flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{expense.description}</h3>
                              <p className="text-sm text-gray-600">
                                Paid by {payer?.name || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {expense.created_at.toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right flex items-center">
                              <div className="font-bold text-lg mr-2">
                                {formatAmount(expense.amount, selectedTrip.currency)}
                              </div>
                              <Badge variant="outline" className="text-xs mr-2">
                                {expense.split_type}
                              </Badge>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                    <Trash2Icon className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the expense "{expense.description}"
                                      and its associated splits.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>
                                      Continue
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="balances" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">Loading balances...</p>
                </CardContent>
              </Card>
            ) : (
              <BalanceView
                balances={balances}
                currency={selectedTrip.currency}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
