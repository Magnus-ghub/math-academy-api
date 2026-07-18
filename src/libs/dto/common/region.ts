import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class UzRegionType {
  @Field()
  code: string;

  @Field()
  name: string;

  @Field(() => [String])
  districts: string[];
}
