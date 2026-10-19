import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String _cookiePrefKey = 'taskora_session_cookies';
  static Map<String, String> _cookies = {};

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final savedCookies = prefs.getString(_cookiePrefKey);
    if (savedCookies != null) {
      try {
        _cookies = Map<String, String>.from(jsonDecode(savedCookies));
      } catch (_) {}
    }
  }

  static Future<void> _saveCookies(http.Response response) async {
    final rawCookies = response.headers['set-cookie'];
    if (rawCookies != null) {
      // Parse incoming Set-Cookie headers
      final parts = rawCookies.split(',');
      for (final part in parts) {
        final pair = part.split(';').first.trim();
        final idx = pair.indexOf('=');
        if (idx > 0) {
          final key = pair.substring(0, idx).trim();
          final val = pair.substring(idx + 1).trim();
          _cookies[key] = val;
        }
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cookiePrefKey, jsonEncode(_cookies));
    }
  }

  static Map<String, String> _buildHeaders([Map<String, String>? extra]) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_cookies.isNotEmpty) {
      headers['Cookie'] = _cookies.entries.map((e) => '${e.key}=${e.value}').join('; ');
    }
    if (extra != null) {
      headers.addAll(extra);
    }
    return headers;
  }

  static Future<dynamic> get(String url) async {
    final response = await http.get(Uri.parse(url), headers: _buildHeaders());
    await _saveCookies(response);
    return _processResponse(response);
  }

  static Future<dynamic> post(String url, Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse(url),
      headers: _buildHeaders(),
      body: jsonEncode(data),
    );
    await _saveCookies(response);
    return _processResponse(response);
  }

  static Future<dynamic> patch(String url, Map<String, dynamic> data) async {
    final response = await http.patch(
      Uri.parse(url),
      headers: _buildHeaders(),
      body: jsonEncode(data),
    );
    await _saveCookies(response);
    return _processResponse(response);
  }

  static Future<dynamic> delete(String url) async {
    final response = await http.delete(Uri.parse(url), headers: _buildHeaders());
    await _saveCookies(response);
    return _processResponse(response);
  }

  static Future<void> clearSession() async {
    _cookies.clear();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cookiePrefKey);
  }

  static dynamic _processResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      try {
        return jsonDecode(response.body);
      } catch (_) {
        return response.body;
      }
    } else {
      String errorMessage = 'Request failed (${response.statusCode})';
      try {
        final body = jsonDecode(response.body);
        if (body is Map && body.containsKey('error')) {
          errorMessage = body['error'].toString();
        }
      } catch (_) {}
      throw ApiException(errorMessage, response.statusCode);
    }
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);

  @override
  String toString() => message;
}
