-- OUTFITI SMART STOCK - Supabase setup
-- Run once in Supabase > SQL Editor > New query.
-- Admin-only product creation, plus the app's RPC name.
CREATE OR REPLACE FUNCTION public.admin_add_product(
  p_name text,
  p_color text,
  p_purchase_price numeric,
  p_selling_price numeric,
  p_variants jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_product_id uuid;
  v_item jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN RAISE EXCEPTION 'Product name required'; END IF;
  IF p_purchase_price IS NULL OR p_purchase_price < 0 OR p_selling_price IS NULL OR p_selling_price < 0 THEN RAISE EXCEPTION 'Invalid price'; END IF;
  IF jsonb_typeof(p_variants) IS DISTINCT FROM 'array' OR jsonb_array_length(p_variants) = 0 THEN RAISE EXCEPTION 'At least one variant required'; END IF;
  INSERT INTO public.products(name,color,purchase_price,selling_price)
  VALUES(trim(p_name),coalesce(trim(p_color),''),p_purchase_price,p_selling_price)
  RETURNING id INTO v_product_id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_variants)
  LOOP
    IF coalesce(trim(v_item->>'size'),'') = '' OR coalesce((v_item->>'quantity')::integer,-1) < 0 THEN RAISE EXCEPTION 'Invalid variant data'; END IF;
    INSERT INTO public.variants(product_id,size,quantity)
    VALUES(v_product_id,trim(v_item->>'size'),(v_item->>'quantity')::integer);
  END LOOP;
  RETURN jsonb_build_object('success',true,'product_id',v_product_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_add_product(text,text,numeric,numeric,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_product(text,text,numeric,numeric,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_product(
  p_name text,
  p_color text,
  p_purchase_price numeric,
  p_selling_price numeric,
  p_variants jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT public.admin_add_product(p_name,p_color,p_purchase_price,p_selling_price,p_variants);
$$;
REVOKE ALL ON FUNCTION public.admin_create_product(text,text,numeric,numeric,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_product(text,text,numeric,numeric,jsonb) TO authenticated;
