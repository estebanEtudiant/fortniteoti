import { IsString, IsInt, IsNotEmpty, IsOptional, MaxLength, MinLength, Min, Max } from 'class-validator';

export class SubmitReviewDto {
  @IsString()
  @IsNotEmpty()
  discordId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  description: string = '';

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  text: string;

  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;
}
