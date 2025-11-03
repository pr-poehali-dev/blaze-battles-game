'''
Business: Handle matchmaking, battles, and game rewards
Args: event with httpMethod, body containing action and game data
Returns: HTTP response with game state or match result
'''

import json
import os
import random
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
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
        
        if action == 'check_match':
            cur.execute(
                "SELECT id, player1_id, player2_id, player1_hp, player2_hp FROM battles WHERE (player1_id = %s OR player2_id = %s) AND status = 'active'",
                (user_id, user_id)
            )
            battle = cur.fetchone()
            cur.close()
            conn.close()
            
            if battle:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'matched': True,
                        'battle_id': battle[0],
                        'player1_id': battle[1],
                        'player2_id': battle[2],
                        'player1_hp': battle[3],
                        'player2_hp': battle[4]
                    }),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'matched': False}),
                'isBase64Encoded': False
            }
        
        elif action == 'battle_state':
            battle_id = params.get('battle_id')
            cur.execute(
                "SELECT player1_id, player2_id, player1_hp, player2_hp, status, winner_id FROM battles WHERE id = %s",
                (battle_id,)
            )
            battle = cur.fetchone()
            cur.close()
            conn.close()
            
            if not battle:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Battle not found'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'player1_id': battle[0],
                    'player2_id': battle[1],
                    'player1_hp': battle[2],
                    'player2_hp': battle[3],
                    'status': battle[4],
                    'winner_id': battle[5]
                }),
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
    
    if action == 'find_match':
        cur.execute(
            "DELETE FROM matchmaking_queue WHERE joined_at < NOW() - INTERVAL '25 seconds'"
        )
        conn.commit()
        
        cur.execute(
            "SELECT user_id FROM matchmaking_queue WHERE user_id != %s AND status = 'waiting' ORDER BY joined_at LIMIT 1",
            (user_id,)
        )
        opponent = cur.fetchone()
        
        if opponent:
            opponent_id = opponent[0]
            cur.execute(
                "INSERT INTO battles (player1_id, player2_id, player1_hp, player2_hp, status) VALUES (%s, %s, 10, 10, 'active') RETURNING id",
                (user_id, opponent_id)
            )
            battle_id = cur.fetchone()[0]
            
            cur.execute(
                "UPDATE matchmaking_queue SET status = 'matched' WHERE user_id IN (%s, %s)",
                (user_id, opponent_id)
            )
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'matched': True,
                    'battle_id': battle_id,
                    'opponent_id': opponent_id
                }),
                'isBase64Encoded': False
            }
        else:
            cur.execute(
                "INSERT INTO matchmaking_queue (user_id, status) VALUES (%s, 'waiting') ON CONFLICT DO NOTHING",
                (user_id,)
            )
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'matched': False, 'searching': True}),
                'isBase64Encoded': False
            }
    
    elif action == 'cancel_search':
        cur.execute("DELETE FROM matchmaking_queue WHERE user_id = %s", (user_id,))
        conn.commit()
        
        cur.execute("SELECT money FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        
        if user:
            new_money = user[0] + 10
            cur.execute("UPDATE users SET money = %s WHERE id = %s", (new_money, user_id))
            conn.commit()
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'reward': 10, 'money': new_money}),
                'isBase64Encoded': False
            }
        
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User not found'}),
            'isBase64Encoded': False
        }
    
    elif action == 'attack':
        battle_id = body_data.get('battle_id')
        attacker_id = user_id
        
        cur.execute(
            "SELECT player1_id, player2_id, player1_hp, player2_hp, status FROM battles WHERE id = %s",
            (battle_id,)
        )
        battle = cur.fetchone()
        
        if not battle or battle[4] != 'active':
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Battle not active'}),
                'isBase64Encoded': False
            }
        
        player1_id, player2_id, player1_hp, player2_hp, status = battle
        
        if attacker_id == player1_id:
            player2_hp -= 2
        elif attacker_id == player2_id:
            player1_hp -= 2
        else:
            cur.close()
            conn.close()
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Not a participant'}),
                'isBase64Encoded': False
            }
        
        winner_id = None
        battle_status = 'active'
        
        if player1_hp <= 0:
            winner_id = player2_id
            battle_status = 'finished'
            cur.execute("UPDATE users SET wins = wins + 1, money = money + 100, spins = spins + 1 WHERE id = %s", (player2_id,))
            cur.execute("UPDATE users SET losses = losses + 1 WHERE id = %s", (player1_id,))
        elif player2_hp <= 0:
            winner_id = player1_id
            battle_status = 'finished'
            cur.execute("UPDATE users SET wins = wins + 1, money = money + 100, spins = spins + 1 WHERE id = %s", (player1_id,))
            cur.execute("UPDATE users SET losses = losses + 1 WHERE id = %s", (player2_id,))
        
        cur.execute(
            "UPDATE battles SET player1_hp = %s, player2_hp = %s, status = %s, winner_id = %s WHERE id = %s",
            (player1_hp, player2_hp, battle_status, winner_id, battle_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'player1_hp': player1_hp,
                'player2_hp': player2_hp,
                'finished': battle_status == 'finished',
                'winner_id': winner_id
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