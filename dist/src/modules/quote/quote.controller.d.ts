import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
export declare class QuoteController {
    private readonly quoteService;
    constructor(quoteService: QuoteService);
    create(createQuoteDto: CreateQuoteDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateQuoteDto: UpdateQuoteDto): string;
    remove(id: string): string;
}
