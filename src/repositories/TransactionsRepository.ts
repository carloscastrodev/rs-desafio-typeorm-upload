import { EntityRepository, Repository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface TransactionItem {
  id: string;
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: Category | undefined;
  created_at: Date;
  updated_at: Date;
}
interface AllTransactionsDTO {
  transactions: TransactionItem[];
  balance: Balance;
}
interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async show(): Promise<AllTransactionsDTO> {
    const transactions = await this.find();
    const categoryRepository = getRepository(Category);
    const categories = await categoryRepository.find();
    const parsedTransactions = transactions.map(
      (transaction): TransactionItem => {
        const {
          id,
          title,
          value,
          type,
          category_id,
          created_at,
          updated_at,
        } = transaction;
        const transactionCategory = categories.find(
          category => category.id === category_id,
        );
        return {
          id,
          title,
          value,
          type,
          category: transactionCategory,
          created_at,
          updated_at,
        };
      },
    );
    const balance = await this.getBalance();
    const response = { transactions: parsedTransactions, balance };
    return response;
  }

  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const balance: Balance = {
      income: 0,
      outcome: 0,
      total: 0,
    };

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        balance.income += transaction.value;
        balance.total += transaction.value;
      } else {
        balance.outcome += transaction.value;
        balance.total -= transaction.value;
      }
    });
    return balance;
  }
}

export default TransactionsRepository;
