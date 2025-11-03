'''
Business: User registration and login with English nicknames only
Args: event with httpMethod, body containing nick and password
Returns: HTTP response with user data and auth token or error
'''

import json
import os
import re
import hashlib
from typing import Dict, Any
import psycopg2

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    action = body_data.get('action')
    nick = body_data.get('nick', '').strip()
    password = body_data.get('password', '')
    
    if not nick or not password:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Nick and password are required'}),
            'isBase64Encoded': False
        }
    
    if not re.match(r'^[a-zA-Z0-9_]+$', nick):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Nick must contain only English letters, numbers, and underscores'}),
            'isBase64Encoded': False
        }
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    database_url = os.environ.get('DATABASE_URL')
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    if action == 'register':
        cur.execute("SELECT id FROM users WHERE nick = %s", (nick,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Nick already exists'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            "INSERT INTO users (nick, password, money, spins) VALUES (%s, %s, 0, 0) RETURNING id, nick, money, spins, wins, losses",
            (nick, password_hash)
        )
        user = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user': {
                    'id': user[0],
                    'nick': user[1],
                    'money': user[2],
                    'spins': user[3],
                    'wins': user[4],
                    'losses': user[5]
                }
            }),
            'isBase64Encoded': False
        }
    
    elif action == 'login':
        cur.execute(
            "SELECT id, nick, money, spins, wins, losses FROM users WHERE nick = %s AND password = %s",
            (nick, password_hash)
        )
        user = cur.fetchone()
        cur.close()
        conn.close()
        
        if not user:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid credentials'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'user': {
                    'id': user[0],
                    'nick': user[1],
                    'money': user[2],
                    'spins': user[3],
                    'wins': user[4],
                    'losses': user[5]
                }
            }),
            'isBase64Encoded': False
        }
    
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'}),
        'isBase64Encoded': False
    }