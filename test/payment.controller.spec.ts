import { ForbiddenException } from '@nestjs/common';
import { PaymentController } from '../src/modules/payment/payment.controller';
import { PaymentService } from '../src/modules/payment/payment.service';
import { UserRole } from '../src/modules/user/entities/user-role.enum';
import { PayoutStatus } from '../src/modules/payment/entities/payout.entity';

describe('PaymentController guards', () => {
  let paymentService: jest.Mocked<PaymentService>;
  let controller: PaymentController;

  beforeEach(() => {
    paymentService = {
      listPayoutsByOwner: jest.fn(),
      updatePayoutStatus: jest.fn(),
    } as unknown as jest.Mocked<PaymentService>;
    controller = new PaymentController(paymentService as any);
  });

  it('should block payout listing for other owners when not admin', () => {
    const call = () => controller.listPayouts(2, { userId: 1, role: UserRole.User } as any);
    expect(call).toThrow(ForbiddenException);
    expect(paymentService.listPayoutsByOwner).not.toHaveBeenCalled();
  });

  it('should allow payout listing for admin', () => {
    paymentService.listPayoutsByOwner.mockResolvedValueOnce([]);
    const result = controller.listPayouts(2, { userId: 1, role: UserRole.Admin } as any);
    expect(result).resolves.toEqual([]);
    expect(paymentService.listPayoutsByOwner).toHaveBeenCalledWith(2);
  });

  it('should block payout status update for non-admin', () => {
    const call = () => controller.updatePayoutStatus(
      10,
      { status: PayoutStatus.PROCESSING },
      { userId: 5, role: UserRole.User } as any,
    );
    expect(call).toThrow(ForbiddenException);
    expect(paymentService.updatePayoutStatus).not.toHaveBeenCalled();
  });

  it('should allow payout status update for admin', () => {
    paymentService.updatePayoutStatus.mockResolvedValueOnce({ id: 10 });
    const result = controller.updatePayoutStatus(
      10,
      { status: PayoutStatus.PAID },
      { userId: 1, role: UserRole.Admin } as any,
    );
    expect(result).resolves.toEqual({ id: 10 });
    expect(paymentService.updatePayoutStatus).toHaveBeenCalledWith({
      payoutId: 10,
      status: PayoutStatus.PAID,
      note: undefined,
    });
  });
});
