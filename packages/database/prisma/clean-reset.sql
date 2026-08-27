-- Script SQL para Limpar 100% do Banco de Dados e Criar Somente o Administrador do SaaS Mateus Vieira

TRUNCATE TABLE 
  customer_messages,
  customer_tags,
  order_item_modifiers,
  order_item_assemblies,
  order_item_complements,
  order_items,
  order_status_history,
  cash_transactions,
  payments,
  inventory_movements,
  orders,
  cash_shifts,
  user_sessions,
  printer_devices,
  delivery_drivers,
  customers,
  tables,
  coupons,
  product_recipes,
  inventory_batches,
  ingredients,
  product_modifier_options,
  product_modifier_groups,
  assembly_options,
  assembly_groups,
  complement_options,
  complement_groups,
  products,
  categories,
  delivery_zones,
  users,
  restaurants
CASCADE;

INSERT INTO users (id, name, email, phone, "passwordHash", role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Mateus Vieira',
  'mateushenrivieira@gmail.com',
  '(87) 99812-3456',
  '41e2a35790e8bccbe4682125da26a7c0:8451bc5cdc406e673ee3b7fd5891eb31139e5bdd5f989034a41df5bab4e37bea3ce5cacc76f32c2e2d99bd6e26a8f907e820c68ce9679884aa0312a13c1815e4',
  'ADMIN',
  true,
  NOW(),
  NOW()
);
