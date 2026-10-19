import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/user.dart';
import '../models/workspace.dart';

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final User? user;
  final Workspace? workspace;
  final String? error;

  AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.workspace,
    this.error,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    User? user,
    Workspace? workspace,
    String? error,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      workspace: workspace ?? this.workspace,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState(isLoading: true)) {
    checkAuth();
  }

  static const String _userCacheKey = 'taskora_cached_user';
  static const String _wsCacheKey = 'taskora_cached_workspace';

  Future<void> checkAuth() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await ApiClient.init();
      final prefs = await SharedPreferences.getInstance();

      final cachedUserStr = prefs.getString(_userCacheKey);
      final cachedWsStr = prefs.getString(_wsCacheKey);

      if (cachedUserStr != null && cachedWsStr != null) {
        final user = User.fromJson(jsonDecode(cachedUserStr));
        final ws = Workspace.fromJson(jsonDecode(cachedWsStr));
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
          workspace: ws,
        );
      }

      // Verify live session with server
      final res = await ApiClient.get(ApiEndpoints.me);
      if (res is Map && res['authenticated'] == true) {
        final user = User.fromJson(res['user'] ?? {});
        final ws = res['workspace'] != null ? Workspace.fromJson(res['workspace']) : state.workspace;

        await prefs.setString(_userCacheKey, jsonEncode(user.toJson()));
        if (ws != null) {
          await prefs.setString(_wsCacheKey, jsonEncode({
            'id': ws.id,
            'name': ws.name,
            'slug': ws.slug,
            'role': ws.role,
            'memberId': ws.memberId,
            'designation': ws.designation,
          }));
        }

        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
          workspace: ws,
        );
      } else {
        if (cachedUserStr == null) {
          state = state.copyWith(isLoading: false, isAuthenticated: false);
        }
      }
    } catch (_) {
      // In offline/transient state, retain cached authentication if available
      final prefs = await SharedPreferences.getInstance();
      final cachedUserStr = prefs.getString(_userCacheKey);
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: cachedUserStr != null,
      );
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.post(ApiEndpoints.login, {
        'email': email.trim(),
        'password': password,
      });

      if (res is Map && res['success'] == true) {
        final user = User.fromJson(res['user'] ?? {});
        final ws = res['workspace'] != null ? Workspace.fromJson(res['workspace']) : null;

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_userCacheKey, jsonEncode(user.toJson()));
        if (ws != null) {
          await prefs.setString(_wsCacheKey, jsonEncode({
            'id': ws.id,
            'name': ws.name,
            'slug': ws.slug,
            'role': ws.role,
            'memberId': ws.memberId,
            'designation': ws.designation,
          }));
        }

        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
          workspace: ws,
          error: null,
        );
        return true;
      } else {
        final errorMsg = res is Map ? res['error']?.toString() : 'Login failed';
        state = state.copyWith(isLoading: false, error: errorMsg);
        return false;
      }
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    await ApiClient.clearSession();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userCacheKey);
    await prefs.remove(_wsCacheKey);
    state = AuthState(isAuthenticated: false, isLoading: false);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
