export class CustomError extends Error {
  static define<TContext>(createMessage: (context: TContext) => string) {
    return class extends CustomError {
      constructor(context: TContext) {
        super(createMessage(context));
      }
    };
  }
}
