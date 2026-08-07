import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useApp } from '@/context/AppContext';

const IMAGE_RATIO = 1200 / 620;

export function HealthcareBanner({ source, eyebrow, title, subtitle, compact = false, accessibilityLabel }) {
  const { isDark } = useApp();
  const { width } = useWindowDimensions();
  const small = width < 380;
  const tablet = width >= 768;

  return (
    <View style={[styles.shell, compact && styles.compactShell]}>
      <ImageBackground
        source={source}
        resizeMode="cover"
        accessibilityLabel={accessibilityLabel || title}
        style={[styles.image, { aspectRatio: tablet ? 2.35 : IMAGE_RATIO }, compact && styles.compactImage]}
        imageStyle={[styles.radius, compact && styles.compactRadius]}>
        <View style={[styles.overlay, compact && styles.compactOverlay, small && styles.smallOverlay, isDark && styles.darkOverlay]}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={[styles.title, small && styles.smallTitle]} numberOfLines={2}>{title}</Text> : null}
          {subtitle ? <Text style={[styles.subtitle, small && styles.smallSubtitle]} numberOfLines={3}>{subtitle}</Text> : null}
        </View>
      </ImageBackground>
    </View>
  );
}

export function HealthcareThumbnail({ source, accessibilityLabel, style }) {
  return <Image source={source} resizeMode="cover" accessibilityLabel={accessibilityLabel} style={[styles.thumbnail, style]}/>;
}

const styles = StyleSheet.create({
  shell: { width: '100%', maxWidth: '100%', overflow: 'hidden', borderRadius: 20, marginBottom: 16 },
  compactShell: { borderRadius: 16, marginBottom: 12 }, image: { width: '100%', maxWidth: '100%', minHeight: 168, maxHeight: 330, justifyContent: 'flex-end', overflow: 'hidden' }, compactImage: { minHeight: 120 },
  radius: { borderRadius: 20 }, compactRadius: { borderRadius: 16 }, overlay: { width: '100%', paddingHorizontal: 18, paddingTop: 42, paddingBottom: 16, backgroundColor: 'rgba(0, 92, 90, 0.42)' },
  compactOverlay: { paddingHorizontal: 14, paddingVertical: 12 }, smallOverlay: { paddingHorizontal: 13, paddingTop: 28, paddingBottom: 12 }, darkOverlay: { backgroundColor: 'rgba(2, 30, 40, 0.60)' },
  eyebrow: { color: '#D9FFFC', fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 5 }, title: { color: '#FFFFFF', fontSize: 22, lineHeight: 27, fontWeight: '900', maxWidth: 520, textShadowColor: 'rgba(0,0,0,0.28)', textShadowRadius: 3 },
  smallTitle: { fontSize: 17, lineHeight: 21 }, subtitle: { color: '#F2FFFE', marginTop: 5, lineHeight: 19, maxWidth: 600, fontSize: 13 }, smallSubtitle: { fontSize: 11, lineHeight: 15 },
  thumbnail: { width: '100%', maxWidth: '100%', height: 130, borderRadius: 16, marginBottom: 12 },
});
