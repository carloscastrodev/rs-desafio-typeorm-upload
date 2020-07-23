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
  transaction: TransactionDTO;
}

class ValidateTransactionService {
  public async execute({ transaction }: Request): Promise<void> {
    const { type, value } = transaction;
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const balance = await transactionsRepository.getBalance();
    const balanceTotal = balance.total;

    if (value < 0) {
      throw new AppError("Transactions can't have a negative value.");
    }

    if (type === 'outcome' && value > balanceTotal) {
      throw new AppError(
        "Doesn't have enough money in balance to execute this transaction.",
      );
    }

    if (type !== 'outcome' && type !== 'income') {
      throw new AppError('Invalid transaction type.');
    }
  }
}

export default ValidateTransactionService;
