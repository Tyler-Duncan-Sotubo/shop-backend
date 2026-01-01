import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
export declare class QuoteService {
    create(createQuoteDto: CreateQuoteDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateQuoteDto: UpdateQuoteDto): string;
    remove(id: number): string;
}
