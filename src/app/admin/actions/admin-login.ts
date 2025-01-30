'use server';

export const adminLogin = async (password: string): Promise<boolean> => {
  const correctPassword = process.env.ADMIN_PASSWORD;

  return correctPassword === password;
};
