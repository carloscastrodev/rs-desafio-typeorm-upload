import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse/lib/sync';
import { getRepository, getCustomRepository, In } from 'typeorm';
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
      const existentCategories = await categoryRepository.find({
        where: In(uniqueCategories),
      });
      const existentCategoriesTitles = existentCategories.map(
        category => category.title,
      );

      const categoriesToCreate = uniqueCategories.filter(
        category => !existentCategoriesTitles.includes(category),
      );

      const createdCategories = categoryRepository.create(
        categoriesToCreate.map(categoryTitle => ({
          title: categoryTitle,
        })),
      );

      await categoryRepository.save(createdCategories);

      const allCategories = [...createdCategories, ...existentCategories];

      const transactionsToCreate = transactions.map(
        ({ title, value, type, category }) => {
          const currentTransactionCategory = allCategories.find(
            targetCategory => targetCategory.title === category,
          );
          return {
            title,
            value,
            type,
            category_id: currentTransactionCategory?.id,
          };
        },
      );

      const newTransactions = transactionsRepository.create(
        transactionsToCreate,
      );

      await transactionsRepository.save(newTransactions);

      await fs.promises.unlink(filePath);
      return newTransactions;
    }
    throw new AppError('Could not find CSV file in upload folder', 500);
  }
}

export default ImportTransactionsService;
