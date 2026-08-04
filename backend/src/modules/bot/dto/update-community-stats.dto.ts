import { IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';

export class UpdateCommunityStatsDto {
  @IsInt()
  @Min(0)
  totalMembers: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  onlineMembers?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  newestMemberUsername?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  newestMemberAvatarUrl?: string;
}
