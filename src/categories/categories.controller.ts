import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import { ImageService, type ImageUploadFile } from '../common/images';
import { CategoryImageResponse } from './category-image.response';
import {
  CategoryResponse,
  PaginatedCategoriesResponse,
} from './category.response';
import { CategoriesService } from './categories.service';
import {
  CategoriesQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';

@ApiTags('Categories')
@Controller('api/v1/admin/categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly imageService: ImageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @ApiCreatedResponse({ type: CategoryResponse })
  @ApiNotFoundResponse({ description: 'Parent category not found' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Post('images')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a category image' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: CategoryImageResponse })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  uploadImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: ImageUploadFile,
  ) {
    return this.imageService.uploadCategoryImage(file);
  }

  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiOkResponse({ type: PaginatedCategoriesResponse })
  findAll(@Query() query: CategoriesQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category' })
  @ApiOkResponse({ type: CategoryResponse })
  @ApiNotFoundResponse({ description: 'Category not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ type: CategoryResponse })
  @ApiBadRequestResponse({ description: 'Invalid category hierarchy' })
  @ApiNotFoundResponse({ description: 'Category or parent category not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiOkResponse({ description: 'Category deleted' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiConflictResponse({ description: 'Category still contains products' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
