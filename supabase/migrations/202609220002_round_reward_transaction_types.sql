-- Reward transactions are distinct from transfers and market operations.
alter type public.transaction_type add value if not exists 'ROUND_POINTS_REWARD';
alter type public.transaction_type add value if not exists 'ROUND_PARTICIPATION_BONUS';
alter type public.transaction_type add value if not exists 'ROUND_POSITION_BONUS';
