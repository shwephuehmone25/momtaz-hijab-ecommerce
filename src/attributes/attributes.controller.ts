import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  AttributeDetailResponse,
  AttributeResponse,
  AttributeValueResponse,
} from './attribute.response';
import { AttributesService } from './attributes.service';
import {
  CreateAttributeDto,
  CreateAttributeValueDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from './dto';

@ApiTags('Attributes')
@Controller('api/v1/admin/attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get()
  @ApiOperation({ summary: 'List product attributes' })
  @ApiOkResponse({ type: [AttributeResponse] })
  findAll() {
    return this.attributesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a product attribute' })
  @ApiCreatedResponse({ type: AttributeResponse })
  @ApiConflictResponse({ description: 'Attribute slug already exists' })
  create(@Body() dto: CreateAttributeDto) {
    return this.attributesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product attribute and its values' })
  @ApiOkResponse({ type: AttributeDetailResponse })
  @ApiNotFoundResponse({ description: 'Attribute not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attributesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product attribute' })
  @ApiOkResponse({ type: AttributeResponse })
  @ApiNotFoundResponse({ description: 'Attribute not found' })
  @ApiConflictResponse({ description: 'Attribute slug already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.attributesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product attribute' })
  @ApiOkResponse({ description: 'Attribute deleted' })
  @ApiNotFoundResponse({ description: 'Attribute not found' })
  @ApiConflictResponse({ description: 'Attribute still has values' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attributesService.remove(id);
  }

  @Get(':id/values')
  @ApiOperation({ summary: 'List values for a product attribute' })
  @ApiOkResponse({ type: [AttributeValueResponse] })
  values(@Param('id', ParseIntPipe) id: number) {
    return this.attributesService.findValues(id);
  }

  @Post(':id/values')
  @ApiOperation({ summary: 'Create a product attribute value' })
  @ApiCreatedResponse({ type: AttributeValueResponse })
  @ApiConflictResponse({ description: 'Attribute value already exists' })
  createValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAttributeValueDto,
  ) {
    return this.attributesService.createValue(id, dto);
  }

  @Put(':id/values/:valueId')
  @ApiOperation({ summary: 'Update a product attribute value' })
  @ApiOkResponse({ type: AttributeValueResponse })
  updateValue(
    @Param('id', ParseIntPipe) id: number,
    @Param('valueId', ParseIntPipe) valueId: number,
    @Body() dto: UpdateAttributeValueDto,
  ) {
    return this.attributesService.updateValue(id, valueId, dto);
  }

  @Delete(':id/values/:valueId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product attribute value' })
  @ApiOkResponse({ description: 'Attribute value deleted' })
  removeValue(
    @Param('id', ParseIntPipe) id: number,
    @Param('valueId', ParseIntPipe) valueId: number,
  ) {
    return this.attributesService.removeValue(id, valueId);
  }
}
