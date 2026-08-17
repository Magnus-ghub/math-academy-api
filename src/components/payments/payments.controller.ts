import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private paymentsService: PaymentsService) {}

  @Post('click/webhook')
  @HttpCode(200)
  async clickWebhook(@Body() body: Record<string, any>) {
    this.logger.log(`Click webhook so'rov: ${JSON.stringify(body)}`);

    const response =
      Number(body?.action) === 0
        ? await this.paymentsService.handleClickPrepare(body)
        : await this.paymentsService.handleClickComplete(body);

    this.logger.log(`Click webhook javob: ${JSON.stringify(response)}`);
    return response;
  }
}
