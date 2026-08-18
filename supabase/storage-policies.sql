-- Rode este arquivo inteiro no SQL Editor do Supabase, depois de criar o projeto.

-- Público de leitura, como o getDownloadURL() do Firebase Storage: a URL só
-- é conhecida por quem já tem acesso à transação (Security Rules do Firestore).
-- file_size_limit/allowed_mime_types espelham receipts.service.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Sem Supabase Auth não dá pra checar auth.uid(), então insert/delete ficam
-- liberados pra qualquer cliente com a anon key — o isolamento por dono
-- continua vindo das Security Rules do Firestore.
drop policy if exists "receipts anon insert" on storage.objects;
create policy "receipts anon insert"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'receipts');

drop policy if exists "receipts anon delete" on storage.objects;
create policy "receipts anon delete"
  on storage.objects for delete
  to anon
  using (bucket_id = 'receipts');
