import pytest
from fastapi.testclient import TestClient
import sys
sys.path.append('..')
from server import app

client = TestClient(app)

def test_get_users():
    """Test obtener lista de usuarios"""
    response = client.get("/api/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_categories():
    """Test obtener categorías"""
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert "student" in data
    assert "staff" in data

def test_dashboard_stats():
    """Test estadísticas del dashboard"""
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_students" in data
    assert "total_teachers" in data

def test_login_invalid():
    """Test login con credenciales inválidas"""
    response = client.post("/api/auth/login", json={
        "email": "invalid@test.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_generate_card_not_found():
    """Test generar carnet de usuario inexistente"""
    response = client.get("/api/cards/generate/usuario-inexistente")
    assert response.status_code == 404
