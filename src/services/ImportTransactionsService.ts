import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse/lib/sync';
import { getRepository, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import ValidateImportService from './ValidateImportService';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

const tmpFolder = uploadConfig.directory;

interface TransactionDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
interface Request {
  filename: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const filePath = path.join(tmpFolder, filename);
    const fileExists = await fs.promises.stat(filePath);
    if (fileExists) {
      const transactionsRepository = getCustomRepository(
        TransactionsRepository,
      );
      const categoryRepository = getRepository(Category);
      const file = await fs.promises.readFile(filePath);

      /* Uses csv-parse to parse the CSV file into an array of objects where each object have the information to craete transaction on the database. */
      const transactions: TransactionDTO[] = csvParse(file, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      const validateImportService = new ValidateImportService();
      await validateImportService.execute({ transactions });

      const categoryTitles: string[] = transactions.map(
        transaction => transaction.category,
      );
      const uniqueCategories = [...new Set(categoryTitles)];

      const createdCategories = uniqueCategories.map(async category => {
        const categoryExists = await categoryRepository.findOne({
          where: { title: category },
        });
        if (!categoryExists) {
          const newCategory = categoryRepository.create({ title: category });
          await categoryRepository.save(newCategory);
          return newCategory;
        }
        return categoryExists;
      });

      await Promise.all(createdCategories);

      const newTransactions = transactions.map(
        async ({ title, value, type, category }): Promise<Transaction> => {
          const categoryToInsert = await categoryRepository.findOne({
            where: { title: category },
          });
          if (categoryToInsert) {
            const categoryId = categoryToInsert.id;
            const newTransaction = transactionsRepository.create({
              title,
              value,
              type,
              category_id: categoryId,
            });
            await transactionsRepository.save(newTransaction);
            return newTransaction;
          }
          throw new AppError(
            "Couldn't complete insertion of uploaded CSV file transactions.",
            500,
          );
        },
      );

      const createdTransactions = await Promise.all(newTransactions);
      await fs.promises.unlink(filePath);
      return createdTransactions;
    }
    throw new AppError('Could not find CSV file in upload folder', 500);
  }
}

export default ImportTransactionsService;
