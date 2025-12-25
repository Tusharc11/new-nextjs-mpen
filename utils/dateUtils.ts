export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, "0")} ${date.toLocaleString(
    "default",
    { month: "short" }
  )} ${date.getFullYear()}`;
};
