import re

# Comprehensive inappropriate content patterns
PROFANITY_PATTERNS = [
    # Common profanity
    r'\b[f]+[u]+[c]+[k]+\w*\b',
    r'\b[s]+[h]+[i]+[t]+\w*\b',
    r'\b[b]+[i]+[t]+[c]+[h]+\w*\b',
    r'\ba[s]+[s]+(?:hole)?\w*\b',
    r'\bd[i]+[c]+[k]+\w*\b',
    r'\bp[i]+[s]+[s]+\w*\b',
    r'\bc[u]+[n]+[t]+\w*\b',
    
    # Racial slurs and hate speech
    r'\bn[i1]+[g]+[e3]+[r]+\w*\b',
    r'\bk[i1]+[k]+[e3]*\w*\b',
    r'\bw[e3]+tb[a4]+[c]+[k]+\w*\b',
    r'\b[c]+h[i1]+n[k]+\w*\b',
    r'\bg[o0]+[o0]+[k]+\w*\b',
    r'\b[s]+p[i1]+[c]+\w*\b',
    r'\b[s]+p[a4]+[d]+[e3]+\w*\b',
    r'\br[a4]+gh[e3]+[a4]+d\w*\b',
    r'\bk[r]+[a4]+[u]+t\w*\b',
    r'\b[d]+[a4]+[g]+[o0]+\w*\b',
    
    # Hate speech and discriminatory terms
    r'\bf[a4]+[g]+[o0]*[t]*\w*\b',
    r'\bd[y]+k[e3]+\w*\b',
    r'\br[e3]+[t]+[a4]+rd\w*\b',
    r'\btr[a4]+nn[y]+\w*\b',
    
    # Sexual content
    r'\b[p]+[o0]+rn\w*\b',
    r'\br[a4]+p[e3]+[d]*\w*\b',
    r'\b[s]+[e3]+x+[y]*\w*\b',
    r'\b[n]+[u]+d[e3]+\w*\b',
    r'\b[p]+[e3]+n[i1]+[s]+\w*\b',
    r'\b[v]+[a4]+g\w*\b',
    r'\bb[o0]+[o0]+b[s]+\w*\b',
    r'\bh[o0]+rn[y]+\w*\b',
    r'\b[o0]+rg[y]+\w*\b',
    
    # Additional profanity
    r'\b[w]+h[o0]+r[e3]+\w*\b',
    r'\bsl[u]+t+\w*\b',
    r'\bb[a4]+st[a4]+rd\w*\b',
    r'\bd[o0]+[u]+[c]+h[e3]+\w*\b',
    r'\bt[w]+[a4]+t+\w*\b',
    
    # Common substitutions and variations
    r'\b[d]+[1i]+[c]+[k]+\w*\b',
    r'\b[p]+[h]+[u]+[k]+\w*\b',
    r'\b[p]+[h]+[a4]+[g]+\w*\b',
    r'\bn[1i]+[g]+[a4]+\w*\b',
    r'\b[s]+3x\w*\b',
    
    # Common hate symbols/references
    r'\b1488\b',
    r'\b88\b',
    r'\bwp\b',
    r'\b[k]+[k]+[k]+\w*\b',
    
    # Additional offensive terms
    r'\bkkk\w*\b',
    r'\bn[a4]+z[1i]+\w*\b',
    r'\bf[a4]+[s]+c[1i]+[s]+[t]+\w*\b',
    r'\bh[1i]+tl[e3]+r\w*\b',
    
    # Common circumvention patterns
    r'\b[n]+[1i]+[g]+\w*\b',
    r'\b[f]+[v]+[c]+[k]+\w*\b',
    r'\b[s]+[e3]+[x]+[x]+\w*\b',
    r'\b[p]+[o0]+[r]+[n]+[o0]+\w*\b',
]

# Character substitutions mapping
CHAR_SUBSTITUTIONS = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '@': 'a', '$': 's', '!': 'i', '+': 't', 
    '(': 'c', ')': 'o', '[': 'c', ']': 'o',
    '/': 'l', '\\': 'l', '|': 'l', '¡': 'i',
    '£': 'e', '¢': 'c', '¥': 'y', '€': 'e'
}

def contains_profanity(text):
    """
    Check if text contains any profanity or inappropriate content.
    Uses regex patterns to catch variations, circumvention attempts, and common substitutions.
    """
    if not text:
        return False
    
    # Pre-process text to catch common circumvention techniques
    processed_text = text.lower()
    
    # Remove common character substitutions
    for char, replacement in CHAR_SUBSTITUTIONS.items():
        processed_text = processed_text.replace(char, replacement)
    
    # Remove repeated characters (e.g., "f****k")
    processed_text = re.sub(r'(.)\1+', r'\1', processed_text)
    
    # Remove non-alphanumeric characters
    processed_text = re.sub(r'[^a-z0-9\s]', '', processed_text)
    
    # Remove spaces between letters of a word (e.g., "f u c k")
    processed_text = re.sub(r'\b\s+(?=[a-z0-9])', '', processed_text)
    
    # Check each pattern
    for pattern in PROFANITY_PATTERNS:
        if re.search(pattern, processed_text):
            return True
    
    # Additional check for words split by spaces or special characters
    words = re.findall(r'\b\w+\b', processed_text)
    combined_text = ''.join(words)
    
    for pattern in PROFANITY_PATTERNS:
        if re.search(pattern, combined_text):
            return True
            
    return False