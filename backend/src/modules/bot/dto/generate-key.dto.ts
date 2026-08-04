import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';

export class GenerateKeyDto {
  @IsString()
  @IsNotEmpty()
  plan: string;

  @IsInt()
  @Min(1)
  @Max(10)
  count: number = 1;

  @IsOptional()
  @IsString()
  product?: string;
}
