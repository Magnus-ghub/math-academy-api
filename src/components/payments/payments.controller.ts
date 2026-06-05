import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('click/webhook')
  @HttpCode(200)
  async clickWebhook(@Body() body: any) {
    console.log('Click webhook body:', body);

    if (!body) return { error: 0, error_note: 'Success' };

    const { click_trans_id, amount, action, error } = body;

    if (action === 1 && error === 0) {
      await this.paymentsService.confirmClickPayment(
        click_trans_id?.toString(),
        amount,
      );
    }

    return { error: 0, error_note: 'Success' };
  }
}
