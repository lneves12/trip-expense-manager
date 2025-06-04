
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRightIcon } from 'lucide-react';
import type { TripBalances } from '../../../server/src/schema';

interface BalanceViewProps {
  balances: TripBalances | null;
  currency: string;
}

export function BalanceView({ balances, currency }: BalanceViewProps) {
  const getCurrencySymbol = (currency: string) => {
    return currency === 'EUR' ? '€' : '$';
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${Math.abs(amount).toFixed(2)}`;
  };

  if (!balances) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">No balance data available</p>
        </CardContent>
      </Card>
    );
  }

  const { balances: participantBalances, settlements } = balances;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Individual Balances
          </CardTitle>
          <CardDescription>
            See who is owed money and who owes money
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participantBalances.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No balances to show yet. Add some expenses first!
            </p>
          ) : (
            <div className="space-y-3">
              {participantBalances.map((balance) => (
                <div key={balance.participant_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {balance.participant_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{balance.participant_name}</span>
                  </div>
                  <div className="text-right">
                    {balance.balance === 0 ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ✅ Settled
                      </Badge>
                    ) : balance.balance > 0 ? (
                      <div className="text-right">
                        <div className="text-green-600 font-semibold">
                          +{formatAmount(balance.balance, currency)}
                        </div>
                        <div className="text-xs text-green-500">is owed</div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="text-red-600 font-semibold">
                          -{formatAmount(balance.balance, currency)}
                        </div>
                        <div className="text-xs text-red-500">owes</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💸 Suggested Settlements
            </CardTitle>
            <CardDescription>
              Minimum transactions to settle all debts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settlements.map((settlement, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {settlement.from_participant.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{settlement.from_participant}</span>
                    </div>
                    <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {settlement.to_participant.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{settlement.to_participant}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">
                      {formatAmount(settlement.amount, currency)}
                    </div>
                    <div className="text-xs text-purple-500">to pay</div>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="text-center text-sm text-gray-600">
              <p>💡 <strong>Tip:</strong> Complete these {settlements.length} transaction{settlements.length === 1 ? '' : 's'} to settle all debts</p>
            </div>
          </CardContent>
        </Card>
      )}

      {settlements.length === 0 && participantBalances.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-green-600 mb-2">All Settled!</h3>
            <p className="text-gray-600">Everyone's expenses are balanced. No payments needed!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
