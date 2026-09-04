insert into private.user_stats (uid, board_size, rating, giantkill, wins, losses, draws)
select uid, 9, points_9, giantkill_9, 0, 0, 0
from private.profiles;

insert into private.user_stats (uid, board_size, rating, giantkill, wins, losses, draws)
select uid, 13, points_13, giantkill_13, 0, 0, 0
from private.profiles;

insert into private.user_settings (uid, allow_bot_match)
select uid, allow_bot_match
from private.profiles;