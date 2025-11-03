'''
Business: Handle matchmaking, battles, admin panel, and power system
Args: event with httpMethod, body containing action and game data
Returns: HTTP response with game state, battle result, or admin operations
'''

import json
import os
import random
import time
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

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
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            action = params.get('action')
            
            if action == 'check_match':
                user_id = params.get('user_id')
                cur.execute(
                    "SELECT id, player1_id, player2_id, player1_hp, player2_hp FROM battles WHERE (player1_id = %s OR player2_id = %s) AND status = 'active'",
                    (user_id, user_id)
                )
                battle = cur.fetchone()
                
                if battle:
                    return success_response({
                        'matched': True,
                        'battle_id': battle['id'],
                        'player1_id': battle['player1_id'],
                        'player2_id': battle['player2_id'],
                        'player1_hp': battle['player1_hp'],
                        'player2_hp': battle['player2_hp']
                    })
                return success_response({'matched': False})
            
            elif action == 'battle_state':
                battle_id = params.get('battle_id')
                cur.execute(
                    """SELECT player1_id, player2_id, player1_hp, player2_hp, player1_shield_until, 
                       player2_shield_until, player1_counter_until, player2_counter_until, 
                       player1_counter_damage, player2_counter_damage, status, winner_id 
                       FROM battles WHERE id = %s""",
                    (battle_id,)
                )
                battle = cur.fetchone()
                
                if not battle:
                    return error_response('Battle not found', 404)
                
                return success_response(dict(battle))
            
            elif action == 'admin_get_rarities':
                cur.execute("SELECT * FROM rarities ORDER BY drop_chance DESC")
                rarities = cur.fetchall()
                return success_response({'success': True, 'rarities': [dict(r) for r in rarities]})
            
            elif action == 'admin_get_powers':
                cur.execute("""
                    SELECT p.*, r.name as rarity_name 
                    FROM powers_new p 
                    LEFT JOIN rarities r ON p.rarity_id = r.id 
                    ORDER BY p.created_at DESC
                """)
                powers = cur.fetchall()
                return success_response({'success': True, 'powers': [dict(p) for p in powers]})
            
            elif action == 'get_user_powers':
                user_id = params.get('user_id')
                cur.execute("""
                    SELECT p.id, p.name, p.power_type, p.cooldown, p.damage, p.shield_duration
                    FROM user_powers up
                    JOIN powers_new p ON up.power_id = p.id
                    WHERE up.user_id = %s
                """, (user_id,))
                powers = cur.fetchall()
                return success_response({'success': True, 'powers': [dict(p) for p in powers]})
        
        if method != 'POST':
            return error_response('Method not allowed', 405)
        
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        user_id = body_data.get('user_id')
        
        # Matchmaking actions
        if action == 'find_match':
            cur.execute("DELETE FROM matchmaking_queue WHERE joined_at < NOW() - INTERVAL '25 seconds'")
            conn.commit()
            
            cur.execute(
                "SELECT user_id FROM matchmaking_queue WHERE user_id != %s ORDER BY joined_at LIMIT 1",
                (user_id,)
            )
            opponent = cur.fetchone()
            
            if opponent:
                opponent_id = opponent['user_id']
                cur.execute(
                    "INSERT INTO battles (player1_id, player2_id, player1_hp, player2_hp, status) VALUES (%s, %s, 10, 10, 'active') RETURNING id",
                    (user_id, opponent_id)
                )
                battle_id = cur.fetchone()['id']
                cur.execute("DELETE FROM matchmaking_queue WHERE user_id IN (%s, %s)", (user_id, opponent_id))
                conn.commit()
                
                return success_response({
                    'matched': True,
                    'battle_id': battle_id,
                    'opponent_id': opponent_id
                })
            else:
                cur.execute(
                    "INSERT INTO matchmaking_queue (user_id) VALUES (%s) ON CONFLICT DO NOTHING",
                    (user_id,)
                )
                conn.commit()
                return success_response({'matched': False, 'searching': True})
        
        elif action == 'cancel_search':
            cur.execute("DELETE FROM matchmaking_queue WHERE user_id = %s", (user_id,))
            cur.execute("UPDATE users SET money = money + 10 WHERE id = %s RETURNING money", (user_id,))
            result = cur.fetchone()
            conn.commit()
            
            if result:
                return success_response({'success': True, 'reward': 10, 'money': result['money']})
            return error_response('User not found', 404)
        
        # Battle actions
        elif action == 'attack':
            battle_id = body_data.get('battle_id')
            return handle_attack(cur, conn, battle_id, user_id, 2)
        
        elif action == 'use_power':
            battle_id = body_data.get('battle_id')
            power_id = body_data.get('power_id')
            return handle_power_use(cur, conn, battle_id, user_id, power_id)
        
        # Admin actions
        elif action == 'admin_create_power':
            return admin_create_power(cur, conn, body_data)
        
        elif action == 'admin_delete_power':
            power_id = body_data.get('power_id')
            cur.execute("DELETE FROM powers_new WHERE id = %s", (power_id,))
            conn.commit()
            return success_response({'success': True})
        
        elif action == 'admin_create_rarity':
            name = body_data.get('name')
            drop_chance = body_data.get('drop_chance')
            color = body_data.get('color')
            cur.execute(
                "INSERT INTO rarities (name, drop_chance, color) VALUES (%s, %s, %s)",
                (name, drop_chance, color)
            )
            conn.commit()
            return success_response({'success': True})
        
        elif action == 'admin_delete_rarity':
            rarity_id = body_data.get('rarity_id')
            cur.execute("DELETE FROM rarities WHERE id = %s", (rarity_id,))
            conn.commit()
            return success_response({'success': True})
        
        elif action == 'admin_give_spins':
            return admin_give_resource(cur, conn, body_data, 'spins')
        
        elif action == 'admin_give_money':
            return admin_give_resource(cur, conn, body_data, 'money')
        
        return error_response('Invalid action', 400)
        
    except Exception as e:
        conn.rollback()
        return error_response(str(e), 500)
    finally:
        cur.close()
        conn.close()


def handle_attack(cur, conn, battle_id: int, attacker_id: int, damage: int) -> Dict[str, Any]:
    cur.execute(
        """SELECT player1_id, player2_id, player1_hp, player2_hp, player1_shield_until, 
           player2_shield_until, player1_counter_until, player2_counter_until, 
           player1_counter_damage, player2_counter_damage, status 
           FROM battles WHERE id = %s""",
        (battle_id,)
    )
    battle = cur.fetchone()
    
    if not battle or battle['status'] != 'active':
        return error_response('Battle not active', 400)
    
    now_ms = int(time.time() * 1000)
    is_player1 = attacker_id == battle['player1_id']
    
    if not is_player1 and attacker_id != battle['player2_id']:
        return error_response('Not a participant', 403)
    
    # Check if defender has shield
    if is_player1:
        if now_ms < battle['player2_shield_until']:
            return success_response({'success': True, 'blocked': True, 'message': 'Attack blocked by shield!'})
        
        # Check if defender has counter
        if now_ms < battle['player2_counter_until']:
            counter_damage = battle['player2_counter_damage']
            player1_hp = battle['player1_hp'] - counter_damage
            player2_hp = battle['player2_hp']
            cur.execute(
                "UPDATE battles SET player2_counter_until = 0, player1_hp = %s WHERE id = %s",
                (player1_hp, battle_id)
            )
            conn.commit()
            
            winner_id, finished = check_battle_end(cur, conn, battle_id, player1_hp, player2_hp, battle['player1_id'], battle['player2_id'])
            return success_response({
                'success': True,
                'countered': True,
                'damage_taken': counter_damage,
                'player1_hp': player1_hp,
                'player2_hp': player2_hp,
                'finished': finished,
                'winner_id': winner_id
            })
        
        player2_hp = battle['player2_hp'] - damage
        cur.execute("UPDATE battles SET player2_hp = %s WHERE id = %s", (player2_hp, battle_id))
    else:
        if now_ms < battle['player1_shield_until']:
            return success_response({'success': True, 'blocked': True, 'message': 'Attack blocked by shield!'})
        
        if now_ms < battle['player1_counter_until']:
            counter_damage = battle['player1_counter_damage']
            player2_hp = battle['player2_hp'] - counter_damage
            player1_hp = battle['player1_hp']
            cur.execute(
                "UPDATE battles SET player1_counter_until = 0, player2_hp = %s WHERE id = %s",
                (player2_hp, battle_id)
            )
            conn.commit()
            
            winner_id, finished = check_battle_end(cur, conn, battle_id, player1_hp, player2_hp, battle['player1_id'], battle['player2_id'])
            return success_response({
                'success': True,
                'countered': True,
                'damage_taken': counter_damage,
                'player1_hp': player1_hp,
                'player2_hp': player2_hp,
                'finished': finished,
                'winner_id': winner_id
            })
        
        player1_hp = battle['player1_hp'] - damage
        cur.execute("UPDATE battles SET player1_hp = %s WHERE id = %s", (player1_hp, battle_id))
    
    conn.commit()
    
    winner_id, finished = check_battle_end(cur, conn, battle_id, 
        player1_hp if not is_player1 else battle['player1_hp'], 
        player2_hp if is_player1 else battle['player2_hp'],
        battle['player1_id'], battle['player2_id'])
    
    return success_response({
        'success': True,
        'player1_hp': player1_hp if not is_player1 else battle['player1_hp'],
        'player2_hp': player2_hp if is_player1 else battle['player2_hp'],
        'finished': finished,
        'winner_id': winner_id
    })


def handle_power_use(cur, conn, battle_id: int, user_id: int, power_id: int) -> Dict[str, Any]:
    # Check cooldown
    cur.execute(
        "SELECT can_use_at FROM battle_cooldowns WHERE battle_id = %s AND user_id = %s AND power_id = %s",
        (battle_id, user_id, power_id)
    )
    cooldown = cur.fetchone()
    now_ms = int(time.time() * 1000)
    
    if cooldown and now_ms < cooldown['can_use_at']:
        return error_response('Power on cooldown', 400)
    
    # Get power details
    cur.execute(
        "SELECT * FROM powers_new WHERE id = %s",
        (power_id,)
    )
    power = cur.fetchone()
    
    if not power:
        return error_response('Power not found', 404)
    
    # Get battle
    cur.execute(
        "SELECT * FROM battles WHERE id = %s",
        (battle_id,)
    )
    battle = cur.fetchone()
    
    if not battle or battle['status'] != 'active':
        return error_response('Battle not active', 400)
    
    is_player1 = user_id == battle['player1_id']
    
    # Apply power effect
    if power['power_type'] == 'attack':
        result = handle_attack(cur, conn, battle_id, user_id, power['damage'])
    elif power['power_type'] == 'defense':
        shield_until = now_ms + (power['shield_duration'] * 1000)
        if is_player1:
            cur.execute("UPDATE battles SET player1_shield_until = %s WHERE id = %s", (shield_until, battle_id))
        else:
            cur.execute("UPDATE battles SET player2_shield_until = %s WHERE id = %s", (shield_until, battle_id))
        conn.commit()
        result = success_response({'success': True, 'message': f'Shield active for {power["shield_duration"]}s'})
    elif power['power_type'] == 'counter':
        counter_until = now_ms + 3000
        if is_player1:
            cur.execute(
                "UPDATE battles SET player1_counter_until = %s, player1_counter_damage = %s WHERE id = %s",
                (counter_until, power['damage'], battle_id)
            )
        else:
            cur.execute(
                "UPDATE battles SET player2_counter_until = %s, player2_counter_damage = %s WHERE id = %s",
                (counter_until, power['damage'], battle_id)
            )
        conn.commit()
        result = success_response({'success': True, 'message': 'Counter active for 3s'})
    else:
        return error_response('Invalid power type', 400)
    
    # Set cooldown
    next_use = now_ms + (power['cooldown'] * 1000)
    cur.execute(
        """INSERT INTO battle_cooldowns (battle_id, user_id, power_id, can_use_at) 
           VALUES (%s, %s, %s, %s) 
           ON CONFLICT (battle_id, user_id, power_id) 
           DO UPDATE SET can_use_at = %s""",
        (battle_id, user_id, power_id, next_use, next_use)
    )
    conn.commit()
    
    return result


def check_battle_end(cur, conn, battle_id: int, p1_hp: int, p2_hp: int, p1_id: int, p2_id: int):
    winner_id = None
    finished = False
    
    if p1_hp <= 0:
        winner_id = p2_id
        finished = True
        cur.execute("UPDATE users SET wins = wins + 1, money = money + 100, spins = spins + 1 WHERE id = %s", (p2_id,))
        cur.execute("UPDATE users SET losses = losses + 1 WHERE id = %s", (p1_id,))
        cur.execute("UPDATE battles SET status = 'finished', winner_id = %s WHERE id = %s", (winner_id, battle_id))
        conn.commit()
    elif p2_hp <= 0:
        winner_id = p1_id
        finished = True
        cur.execute("UPDATE users SET wins = wins + 1, money = money + 100, spins = spins + 1 WHERE id = %s", (p1_id,))
        cur.execute("UPDATE users SET losses = losses + 1 WHERE id = %s", (p2_id,))
        cur.execute("UPDATE battles SET status = 'finished', winner_id = %s WHERE id = %s", (winner_id, battle_id))
        conn.commit()
    
    return winner_id, finished


def admin_create_power(cur, conn, data: Dict[str, Any]) -> Dict[str, Any]:
    name = data.get('name')
    rarity_id = data.get('rarity_id')
    power_type = data.get('power_type')
    cooldown = data.get('cooldown', 0)
    damage = data.get('damage', 0)
    shield_duration = data.get('shield_duration', 0)
    
    cur.execute(
        """INSERT INTO powers_new (name, rarity_id, power_type, cooldown, damage, shield_duration) 
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (name, rarity_id, power_type, cooldown, damage, shield_duration)
    )
    conn.commit()
    return success_response({'success': True})


def admin_give_resource(cur, conn, data: Dict[str, Any], resource: str) -> Dict[str, Any]:
    target = data.get('target')
    amount = data.get('amount')
    
    if target == 'all':
        cur.execute(f"UPDATE users SET {resource} = {resource} + %s", (amount,))
    else:
        nick = data.get('nick')
        cur.execute(f"UPDATE users SET {resource} = {resource} + %s WHERE nick = %s", (amount, nick))
        if cur.rowcount == 0:
            return error_response('User not found', 404)
    
    conn.commit()
    return success_response({'success': True})


def success_response(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(data),
        'isBase64Encoded': False
    }


def error_response(message: str, status_code: int = 400) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }