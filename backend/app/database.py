import os
from contextlib import contextmanager

from dotenv import load_dotenv
from psycopg import connect
from psycopg.rows import dict_row

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:*06022007@localhost:5432/invesys')
APP_USER = os.getenv('APP_USER', 'api_user')


@contextmanager
def get_conn():
  with connect(DATABASE_URL, row_factory=dict_row) as conn:
    with conn.cursor() as cur:
      cur.execute('select set_config(%s, %s, true)', ('app.user', APP_USER))
    yield conn