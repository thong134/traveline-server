import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ReminderCronService } from './reminder.cron';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly reminderService: ReminderCronService,
  ) {}

  @Post('test/reminders')
  @RequireAuth()
  @ApiOperation({ summary: '[TEST] Trigger upcoming event reminders manually' })
  @ApiOkResponse({ description: 'Reminder check result' })
  testReminders() {
    return this.reminderService.triggerReminderCheck();
  }

  @Get()
  @RequireAuth()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của tôi (Hộp thư)' })
  @ApiOkResponse({ description: 'Danh sách thông báo thành công' })
  findMyNotifications(@CurrentUser() user: RequestUser) {
    return this.notificationService.findMyNotifications(user.userId);
  }

  @Patch(':id/read')
  @RequireAuth()
  @ApiOperation({ summary: 'Đánh dấu thông báo là đã đọc' })
  @ApiOkResponse({ description: 'Cập nhật trạng thái thành công' })
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationService.markAsRead(id, user.userId);
  }
}
