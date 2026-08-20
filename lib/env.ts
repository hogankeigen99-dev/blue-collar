if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env (locally) or set it in your deploy environment."
  );
}
