import { Controller, Get } from '@nestjs/common';
import { Public } from '../decorators/public.decorator.js';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; dateTime: string } {
    return { status: 'ok', dateTime: new Date().toISOString() };
  }
}
