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
                """SELECT p.id, p.name, r.name as rarity_name, r.color, p.power_type, 
                          p.cooldown, p.damage, p.shield_duration, up.obtained_at, up.equipped_slot
                FROM user_powers up 
                JOIN powers_new p ON up.power_id = p.id 
                JOIN rarities r ON p.rarity_id = r.id
                WHERE up.user_id = %s 
                ORDER BY up.equipped_slot NULLS LAST, up.obtained_at DESC""",
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
                            'rarity_color': item[3],
                            'power_type': item[4],
                            'cooldown': item[5],
                            'damage': item[6],
                            'shield_duration': item[7],
                            'obtained_at': str(item[8]),
                            'equipped_slot': item[9]
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
        
        cur.execute("""
            SELECT p.id, p.name, r.name as rarity_name, r.color, r.drop_chance
            FROM powers_new p
            JOIN rarities r ON p.rarity_id = r.id
        """)
        all_powers = cur.fetchall()
        
        if not all_powers:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No powers available in the game yet'}),
                'isBase64Encoded': False
            }
        
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
                    'color': selected_power[3]
                }
            }),
            'isBase64Encoded': False
        }
    
    if action == 'equip_power':
        power_id = body_data.get('power_id')
        slot = body_data.get('slot')
        
        if not slot or slot < 1 or slot > 3:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid slot (must be 1-3)'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            "SELECT id FROM user_powers WHERE user_id = %s AND power_id = %s",
            (user_id, power_id)
        )
        if not cur.fetchone():
            cur.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Power not found in inventory'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            "UPDATE user_powers SET equipped_slot = NULL WHERE user_id = %s AND equipped_slot = %s",
            (user_id, slot)
        )
        
        cur.execute(
            "UPDATE user_powers SET equipped_slot = %s WHERE user_id = %s AND power_id = %s",
            (slot, user_id, power_id)
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}),
            'isBase64Encoded': False
        }
    
    if action == 'unequip_power':
        power_id = body_data.get('power_id')
        
        cur.execute(
            "UPDATE user_powers SET equipped_slot = NULL WHERE user_id = %s AND power_id = %s",
            (user_id, power_id)
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}),
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