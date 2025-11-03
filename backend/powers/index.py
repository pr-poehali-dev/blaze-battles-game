'''
Business: Manage powers catalog, user inventory, and spin system
Args: event with httpMethod, body containing action and user data
Returns: HTTP response with powers list, inventory, or spin result
'''

import json
import os
import random
from typing import Dict, Any
import psycopg2

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    database_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    if method == 'GET':
        params = event.get('queryStringParameters', {})
        action = params.get('action')
        user_id = params.get('user_id')
        
        if action == 'catalog':
            cur.execute("""
                SELECT p.id, p.name, r.name as rarity_name, p.power_type, p.cooldown, p.damage, p.shield_duration
                FROM powers_new p
                JOIN rarities r ON p.rarity_id = r.id
                ORDER BY r.drop_chance ASC
            """)
            powers = cur.fetchall()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'powers': [
                        {
                            'id': p[0], 
                            'name': p[1], 
                            'rarity': p[2],
                            'power_type': p[3],
                            'cooldown': p[4],
                            'damage': p[5],
                            'shield_duration': p[6]
                        }
                        for p in powers
                    ]
                }),
                'isBase64Encoded': False
            }
        
        elif action == 'inventory':
            cur.execute(
                """SELECT p.id, p.name, p.rarity, p.effect, up.obtained_at 
                FROM user_powers up 
                JOIN powers p ON up.power_id = p.id 
                WHERE up.user_id = %s 
                ORDER BY up.obtained_at DESC""",
                (user_id,)
            )
            inventory = cur.fetchall()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'inventory': [
                        {
                            'id': item[0],
                            'name': item[1],
                            'rarity': item[2],
                            'effect': item[3],
                            'obtained_at': str(item[4])
                        }
                        for item in inventory
                    ]
                }),
                'isBase64Encoded': False
            }
        
        elif action == 'user_stats':
            cur.execute("SELECT money, spins FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            cur.close()
            conn.close()
            
            if not user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'money': user[0], 'spins': user[1]}),
                'isBase64Encoded': False
            }
    
    if method != 'POST':
        cur.close()
        conn.close()
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    action = body_data.get('action')
    user_id = body_data.get('user_id')
    
    if action == 'spin':
        cur.execute("SELECT spins FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        
        if not user or user[0] < 1:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Not enough spins'}),
                'isBase64Encoded': False
            }
        
        cur.execute("SELECT id, name, rarity, effect, drop_chance FROM powers")
        all_powers = cur.fetchall()
        
        rand_num = random.uniform(0, 100)
        cumulative = 0
        selected_power = None
        
        for power in all_powers:
            cumulative += float(power[4])
            if rand_num <= cumulative:
                selected_power = power
                break
        
        if not selected_power:
            selected_power = all_powers[0]
        
        cur.execute("UPDATE users SET spins = spins - 1 WHERE id = %s", (user_id,))
        
        cur.execute(
            "INSERT INTO user_powers (user_id, power_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user_id, selected_power[0])
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'power': {
                    'id': selected_power[0],
                    'name': selected_power[1],
                    'rarity': selected_power[2],
                    'effect': selected_power[3]
                }
            }),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'}),
        'isBase64Encoded': False
    }