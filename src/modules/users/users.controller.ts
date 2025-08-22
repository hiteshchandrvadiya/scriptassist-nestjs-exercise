import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { RateLimit } from '@common/decorators/rate-limit.decorator';

@ApiTags('users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ windowMs: 10000, maxRequests: 2 })
  @ApiBearerAuth('access-token')
  @Get()
  public async findAll() {
    return await this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth('access-token')
  @RateLimit({ windowMs: 10000, maxRequests: 2 })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth('access-token')
  @RateLimit({ windowMs: 10000, maxRequests: 2 })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ windowMs: 10000, maxRequests: 2 })
  @ApiBearerAuth('access-token')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
