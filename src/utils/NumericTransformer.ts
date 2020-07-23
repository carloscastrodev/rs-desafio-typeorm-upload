export default class NumericTransformer {
  public to(data: number): number {
    return data;
  }

  public from(data: string): number {
    return parseFloat(data);
  }
}
