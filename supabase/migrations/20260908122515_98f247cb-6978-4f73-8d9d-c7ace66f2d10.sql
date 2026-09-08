
CREATE POLICY "docs_maitre_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents-maitres' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "docs_maitre_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents-maitres' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "docs_maitre_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents-maitres' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'documents-maitres' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "docs_delete_own_or_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents-maitres' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
