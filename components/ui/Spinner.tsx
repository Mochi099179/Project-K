export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-primary/25"
      style={{ width: size, height: size, borderTopColor: "#6D9773" }}
    />
  );
}
