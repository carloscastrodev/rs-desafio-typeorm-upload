import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}
class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transaction = await transactionsRepository.findOne(id);

    if (transaction) {
      await transactionsRepository.delete(id);
    } else {
      throw new AppError("Transaction doesn't exist", 404);
    }
  }
}

export default DeleteTransactionService;
