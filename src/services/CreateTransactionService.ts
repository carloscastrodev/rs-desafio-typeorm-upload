// import AppError from '../errors/AppError';

import { getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import ValidateTransactionService from './ValidateTransactionService';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const validateTransaction = new ValidateTransactionService();
    await validateTransaction.execute({
      transaction: { title, value, type, category },
    });

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const categoryExists = await categoryRepository.findOne({
      where: { title: category },
    });

    let categoryId;
    if (!categoryExists) {
      const newCategory = categoryRepository.create({ title: category });
      await categoryRepository.save(newCategory);
      categoryId = newCategory.id;
    } else {
      categoryId = categoryExists.id;
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryId,
    });

    await transactionsRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
