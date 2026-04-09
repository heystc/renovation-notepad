import React from 'react';
import type { ExpenseItem } from '../../types';
import { DollarSign } from 'lucide-react';

interface BudgetSummaryProps {
  expenses: ExpenseItem[];
}

export const BudgetSummary: React.FC<BudgetSummaryProps> = ({ expenses }) => {
  const totalBudgeted = expenses.reduce((sum, e) => sum + e.budgeted, 0);
  const totalActual = expenses.reduce((sum, e) => sum + e.actual, 0);
  const remaining = totalBudgeted - totalActual;
  const overBudget = totalActual > totalBudgeted;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">总预算</p>
            <p className="text-xl font-bold text-gray-900">¥{totalBudgeted.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">已花费</p>
            <p className="text-xl font-bold text-gray-900">¥{totalActual.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className={cn("p-3 rounded-lg", overBudget ? "bg-red-100" : "bg-green-100")}>
            <DollarSign className={cn("w-5 h-5", overBudget ? "text-red-600" : "text-green-600")} />
          </div>
          <div>
            <p className="text-sm text-gray-500">剩余预算</p>
            <p className={cn("text-xl font-bold", overBudget ? "text-red-600" : "text-green-600")}>
              ¥{Math.abs(remaining).toLocaleString()}
              {overBudget ? ' 超支' : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default BudgetSummary;
