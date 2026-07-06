interface PageStubProps {
  title: string;
  note: string;
}

export function PageStub({ title, note }: PageStubProps) {
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-10 md:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
      <p className="mt-2 text-sm text-muted">{note}</p>
    </div>
  );
}
