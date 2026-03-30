'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Phone, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

interface MemberData {
  nom_complet: string
  compte_active: boolean
  telephone: string
}

export default function PreinscriptionPage() {
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'lookup' | 'register' | 'exists'>('lookup')
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await supabase.rpc('fn_preinscription_lookup_telephone', {
        p_telephone: telephone
      })

      if (error) {
        setError('Numéro non reconnu. Veuillez contacter l\'administrateur.')
        return
      }

      if (data && data.length > 0) {
        const member = data[0]
        setMemberData({
          nom_complet: member.nom_complet,
          compte_active: member.compte_active,
          telephone: member.telephone
        })

        if (member.compte_active) {
          setStep('exists')
          setSuccess('Votre compte est déjà activé. Veuillez vous connecter.')
        } else {
          setStep('register')
          setSuccess(`Bienvenue ${member.nom_complet} ! Veuillez créer votre compte.`)
        }
      } else {
        setError('Numéro non reconnu. Veuillez contacter l\'administrateur.')
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      setLoading(false)
      return
    }

    try {
      // Créer le compte Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom_complet: memberData?.nom_complet,
            telephone: memberData?.telephone
          }
        }
      })

      console.log('📝 signUp résultat:', { authData, authError })

      if (authError) {
        console.error('❌ Erreur signUp:', authError)
        setError('Erreur lors de la création du compte: ' + authError.message)
        return
      }

      if (!authData.user) {
        console.error('❌ Aucun utilisateur retourné après signUp')
        setError('Échec de la création du compte. Veuillez réessayer.')
        return
      }

      if (authData.user) {
        console.log('✅ signUp réussi:', authData.user)
        
        // Tenter la connexion avec les mêmes identifiants
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        console.log('🔐 signInWithPassword résultat:', { signInData, signInError })

        if (signInError) {
          console.error('❌ Erreur signIn:', signInError)
          setError('Erreur lors de la connexion. Veuillez réessayer.')
          return
        }

        if (!signInData.session) {
          console.error('❌ Session absente après signIn')
          setError('Compte créé mais session non active. Vérifiez si une confirmation email est requise ou contactez l\'administrateur.')
          return
        }

        console.log('✅ Session active:', signInData.session.user.id)

        // Vérification finale de session
        const { data: sessionCheck } = await supabase.auth.getSession()
        console.log('🔍 getSession final:', sessionCheck)

        if (!sessionCheck.session) {
          console.error('❌ Session non confirmée par getSession')
          setError('Session non validée. Veuillez confirmer votre email ou contacter l\'administrateur.')
          return
        }

        // Finaliser la pré-inscription seulement si session active
        console.log('📞 Appel fn_finaliser_preinscription avec:', {
          telephone: memberData?.telephone,
          email: email
        })

        const { data: rpcData, error: finalError } = await supabase.rpc('fn_finaliser_preinscription', {
          p_telephone: memberData?.telephone,
          p_email_connexion: email
        })

        console.log('📞 fn_finaliser_preinscription résultat:', { rpcData, finalError })

        if (finalError) {
          console.error('❌ Erreur RPC finalisation:', finalError)
          setError('Erreur lors de la finalisation: ' + finalError.message)
          return
        }

        console.log('🎉 Pré-inscription finalisée avec succès')
        // Rediriger vers dashboard
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-3d p-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4">
          <span className="text-white font-bold text-2xl">ASF</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">NTOL</h1>
        <p className="text-gray-600 mt-2">Association Famille NTOL</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      {/* Step 1: Lookup */}
      {step === 'lookup' && (
        <form onSubmit={handleLookup} className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Première connexion</h2>
            <p className="text-gray-600">Entrez votre numéro de téléphone pour vérifier votre appartenance à l'association.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de téléphone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="+228 XX XX XX XX"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Vérification...
              </>
            ) : (
              <>
                Vérifier mon numéro
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: Register */}
      {step === 'register' && memberData && (
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-lg font-medium text-gray-900">{memberData.nom_complet}</p>
            <p className="text-sm text-gray-600">Compte à activer</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email de connexion
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="votre@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Création du compte...
              </>
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>
      )}

      {/* Step 3: Account exists */}
      {step === 'exists' && (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
            <CheckCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">Compte déjà activé</p>
            <p className="text-gray-600 mt-2">Votre compte est déjà activé. Veuillez vous connecter.</p>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full btn-primary py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Se connecter
          </button>
        </div>
      )}

      {/* Links */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-gray-600">
          Déjà un compte ?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  )
}
