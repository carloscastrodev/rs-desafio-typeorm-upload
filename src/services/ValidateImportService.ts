// import AppError from '../errors/AppError';

import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface TransactionDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

interface Request {
  transactions: TransactionDTO[];
}

class ValidateImportService {
  public async execute({ transactions }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const balance = await transactionsRepository.getBalance();
    const balanceTotal = balance.total;

    const transactionsValues = transactions.map(transaction => {
      if (transaction.type === 'income') {
        return transaction.value;
      }
      return -transaction.value;
    });

    const csvBalance = transactionsValues.reduce(
      (total: number, value: number) => total + value,
    );

    if (balanceTotal + csvBalance < 0) {
      throw new AppError('CSV file contains invalid transactions.');
    }
  }
}

export default ValidateImportService;
