import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Text,
  FlatList,
  Modal
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import { searchUsers } from '../utils/storage';

const SearchBar = ({ onUserSelect, placeholder = "Search users..." }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (text) => {
    setSearchQuery(text);
    
    if (text.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(text.trim());
      setSearchResults(results);
      setShowResults(results.length > 0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user) => {
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);
    if (onUserSelect) {
      onUserSelect(user);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showResults && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id || item.uid}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.resultItem}
                onPress={() => handleSelectUser(item)}
              >
                <View style={styles.resultAvatar}>
                  <Text style={styles.resultAvatarText}>
                    {(item.username || item.displayName || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>
                    {item.displayName || item.username}
                  </Text>
                  <Text style={styles.resultUsername}>
                    @{item.username}
                  </Text>
                </View>
                {item.role === 'admin' && (
                  <Text style={styles.adminBadge}>👑</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !isSearching ? (
                <View style={styles.emptyResults}>
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  clearText: {
    color: COLORS.textTertiary,
    fontSize: 16,
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neonCyan,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  resultAvatarText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  resultUsername: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  adminBadge: {
    fontSize: 18,
  },
  emptyResults: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.body,
  },
});

export default SearchBar;
