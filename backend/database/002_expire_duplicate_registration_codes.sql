UPDATE registration_confirmation_codes current_code
INNER JOIN (
  SELECT
    email,
    id_Condominio,
    MAX(id) AS keep_id
  FROM registration_confirmation_codes
  WHERE consumed_at IS NULL
  GROUP BY email, id_Condominio
  HAVING COUNT(*) > 1
) latest_code
  ON latest_code.email = current_code.email
  AND latest_code.id_Condominio = current_code.id_Condominio
SET current_code.consumed_at = NOW()
WHERE current_code.consumed_at IS NULL
  AND current_code.id <> latest_code.keep_id;
