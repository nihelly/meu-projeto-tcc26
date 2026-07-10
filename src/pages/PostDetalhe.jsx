import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  ArrowLeft, 
  MoreHorizontal, 
  Smile, 
  Paperclip, 
  Send, 
  Trash2, 
  Edit2, 
  Flag, 
  FileText, 
  Eye, 
  EyeOff, 
  Pin,
  Calendar,
  Users,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function PostDetalhe() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { usuario, perfil } = useAuth();

  // Estados de dados
  const [post, setPost] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [respostas, setRespostas] = useState([]);
  const [curtidasComentarios, setCurtidasComentarios] = useState([]);
  const [curtidasRespostas, setCurtidasRespostas] = useState([]);
  const [perfisMap, setPerfisMap] = useState({});
  const [compartilhamentosCount, setCompartilhamentosCount] = useState(4);
  const [pessoasQueCurtiram, setPessoasQueCurtiram] = useState([]);
  const [turmaObj, setTurmaObj] = useState(null);

  // Estados locais
  const [loading, setLoading] = useState(true);
  const [ordenacao, setOrdenacao] = useState('mais_recentes'); // 'mais_recentes' | 'mais_antigos' | 'mais_curtidos'
  const [novoComentario, setNovoComentario] = useState('');
  const [respostaAtivaCommentId, setRespostaAtivaCommentId] = useState(null);
  const [novaRespostaText, setNovaRespostaText] = useState('');
  const [editandoCommentId, setEditandoCommentId] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState('');

  // Seletores e Anexos
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [anexoUrl, setAnexoUrl] = useState('');
  const [anexoNome, setAnexoNome] = useState('');
  const [anexosList, setAnexosList] = useState([]);

  // Filtro de Linguagem Ofensiva
  const palavrasProibidas = ['palavrao', 'idiota', 'bobo', 'inadequado', 'ofensa', 'lixo', 'inútil', 'burro'];

  useEffect(() => {
    carregarPostCompleto();
  }, [postId, usuario, perfil]);

  async function carregarPostCompleto() {
    if (!postId) return;
    try {
      setLoading(true);

      // 1. Obter Postagem
      const { data: dataPost, error: errPost } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (errPost) throw errPost;
      
      // Curtidas do Post
      const { data: dataLikes } = await supabase.from('likes').select('user_id').eq('post_id', postId);
      const curtiramIds = dataLikes ? dataLikes.map(l => l.user_id) : [];
      const usuarioCurtiu = usuario ? curtiramIds.includes(usuario.id) : false;

      // 2. Perfis dos envolvidos
      const { data: dataProfiles } = await supabase.from('profiles').select('*');
      const pMap = {};
      if (dataProfiles) {
        dataProfiles.forEach(p => { pMap[p.id] = p; });
        setPerfisMap(pMap);
        setPessoasQueCurtiram(dataProfiles.filter(p => curtiramIds.includes(p.id)));
      }

      // Detalhes do Autor
      const autorProfile = pMap[dataPost.user_id] || {};
      
      // Vincular turma
      if (autorProfile.turma) {
        const { data: tData } = await supabase.from('turmas').select('*').eq('nome', autorProfile.turma).maybeSingle();
        if (tData) setTurmaObj(tData);
      }

      setPost({
        ...dataPost,
        likesCount: curtiramIds.length,
        usuarioCurtiu,
        authorName: autorProfile.nome || 'Usuário EduConnect',
        authorAvatar: autorProfile.avatar_url,
        authorRole: autorProfile.papel || 'Aluno'
      });

      // 3. Comentários
      const { data: dataComments } = await supabase.from('comments').select('*').eq('post_id', postId);
      setComentarios(dataComments || []);

      // 4. Respostas dos comentários
      const commentIds = dataComments ? dataComments.map(c => c.id) : [];
      if (commentIds.length > 0) {
        const { data: dataReplies } = await supabase.from('comment_replies').select('*').in('comment_id', commentIds);
        setRespostas(dataReplies || []);

        const { data: dataCLikes } = await supabase.from('comment_likes').select('*').in('comment_id', commentIds);
        setCurtidasComentarios(dataCLikes || []);
      } else {
        setRespostas([]);
        setCurtidasComentarios([]);
      }

      // 5. Curtidas das respostas
      const { data: dataRLikes } = await supabase.from('reply_likes').select('*');
      setCurtidasRespostas(dataRLikes || []);

      // Compartilhamentos
      const { count: sCount } = await supabase.from('post_shares').select('*', { count: 'exact', head: true }).eq('post_id', postId);
      setCompartilhamentosCount(sCount || 0);

    } catch (err) {
      console.error(err);
      toast.error('Erro ao abrir postagem.');
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  }

  const ehAdmin = () => perfil?.papel === 'administrador';
  const ehProfessor = () => perfil?.papel === 'professor' || ehAdmin();

  // Filtro de Linguagem
  const contemLinguagemOfensiva = (texto) => {
    return palavrasProibidas.some(palavra => texto.toLowerCase().includes(palavra));
  };

  // Like do Post
  const handleLikePost = async () => {
    if (!usuario || !post) return;
    const jaCurtido = post.usuarioCurtiu;

    try {
      if (jaCurtido) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', usuario.id);
        setPost(prev => ({ ...prev, usuarioCurtiu: false, likesCount: Math.max(0, prev.likesCount - 1) }));
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: usuario.id });
        setPost(prev => ({ ...prev, usuarioCurtiu: true, likesCount: prev.likesCount + 1 }));

        // Notificar o autor do post
        if (post.user_id !== usuario.id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            actor_id: usuario.id,
            content: `${perfil?.nome} curtiu a sua postagem "${post.title}"`,
            type: 'like'
          });
        }
      }
      carregarPostCompleto();
    } catch (err) {
      console.error(err);
    }
  };

  // Adicionar Comentário
  const handleAdicionarComentario = async (e) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;

    if (contemLinguagemOfensiva(novoComentario)) {
      toast.error('O seu comentário contém termos que violam as regras da comunidade.');
      return;
    }

    try {
      const attachmentsJson = anexosList.length > 0 ? JSON.stringify(anexosList) : '[]';

      const { data: newC, error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: usuario.id,
        content: novoComentario.trim(),
        attachments: attachmentsJson
      }).select().single();

      if (error) throw error;

      // Notificar o autor do post
      if (post.user_id !== usuario.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: usuario.id,
          content: `${perfil?.nome} comentou na sua postagem: "${novoComentario.substring(0, 30)}..."`,
          type: 'comment'
        });
      }

      // Processar menções com "@"
      const mencoes = novoComentario.match(/@(\w+)/g);
      if (mencoes) {
        for (const mencao of mencoes) {
          const username = mencao.replace('@', '').toLowerCase();
          const pMatch = Object.values(perfisMap).find(p => p.nome?.toLowerCase().replace(/\s+/g, '') === username);
          if (pMatch && pMatch.id !== usuario.id) {
            await supabase.from('notifications').insert({
              user_id: pMatch.id,
              actor_id: usuario.id,
              content: `${perfil?.nome} mencionou você em um comentário`,
              type: 'mention'
            });
          }
        }
      }

      toast.success('Comentário publicado!');
      setNovoComentario('');
      setAnexosList([]);
      carregarPostCompleto();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao postar comentário.');
    }
  };

  // Responder Comentário
  const handleAdicionarResposta = async (e, commentId) => {
    e.preventDefault();
    if (!novaRespostaText.trim()) return;

    if (contemLinguagemOfensiva(novaRespostaText)) {
      toast.error('A sua resposta contém termos inadequados para a comunidade escolar.');
      return;
    }

    try {
      const { data: newR, error } = await supabase.from('comment_replies').insert({
        comment_id: commentId,
        user_id: usuario.id,
        content: novaRespostaText.trim()
      }).select().single();

      if (error) throw error;

      const coment = comentarios.find(c => c.id === commentId);
      if (coment && coment.user_id !== usuario.id) {
        await supabase.from('notifications').insert({
          user_id: coment.user_id,
          actor_id: usuario.id,
          content: `${perfil?.nome} respondeu ao seu comentário: "${novaRespostaText.substring(0, 30)}..."`,
          type: 'comment'
        });
      }

      toast.success('Resposta compartilhada!');
      setNovaRespostaText('');
      setRespostaAtivaCommentId(null);
      carregarPostCompleto();
    } catch (err) {
      console.error(err);
    }
  };

  // Like de Comentário
  const handleLikeComentario = async (commentId) => {
    if (!usuario) return;
    const jaCurtido = curtidasComentarios.some(l => l.comment_id === commentId && l.user_id === usuario.id);

    try {
      if (jaCurtido) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', usuario.id);
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: usuario.id });
      }
      carregarPostCompleto();
    } catch (err) {
      console.error(err);
    }
  };

  // Excluir Comentário
  const handleExcluirComentario = async (commentId, autorId) => {
    if (usuario.id !== autorId && !ehProfessor()) {
      toast.error('Você não tem permissão para excluir este comentário.');
      return;
    }
    if (!window.confirm('Excluir este comentário permanentemente?')) return;

    try {
      await supabase.from('comments').delete().eq('id', commentId);
      toast.success('Comentário excluído.');
      
      // Log moderação se deletado por outro
      if (usuario.id !== autorId) {
        await supabase.from('system_logs').insert({
          user_id: usuario.id,
          action: `Excluiu comentário inadequado do usuário ${autorId}`,
          module: 'Comentários'
        });

        await supabase.from('notifications').insert({
          user_id: autorId,
          actor_id: usuario.id,
          content: 'Seu comentário foi removido por violar as diretrizes da comunidade.',
          type: 'system'
        });
      }
      
      carregarPostCompleto();
    } catch (err) {
      console.error(err);
    }
  };

  // Compartilhamento
  const handleCompartilhar = async (tipo) => {
    try {
      await supabase.from('post_shares').insert({
        post_id: postId,
        user_id: usuario.id,
        target_type: tipo
      });

      toast.success(`Postagem compartilhada no seu ${tipo === 'perfil' ? 'perfil' : 'painel de destaques'}!`);
      carregarPostCompleto();
    } catch (err) {
      console.error(err);
    }
  };

  const getAutorNome = (userId) => perfisMap[userId]?.nome || 'Usuário';
  const getAutorAvatar = (userId) => perfisMap[userId]?.avatar_url;
  const getAutorRole = (userId) => perfisMap[userId]?.papel || 'Aluno';

  // Ordenação dos comentários
  const comentariosOrdenados = [...comentarios].sort((a, b) => {
    if (ordenacao === 'mais_antigos') {
      return new Date(a.created_at) - new Date(b.created_at);
    }
    if (ordenacao === 'mais_curtidos') {
      const likesA = curtidasComentarios.filter(l => l.comment_id === a.id).length;
      const likesB = curtidasComentarios.filter(l => l.comment_id === b.id).length;
      return likesB - likesA;
    }
    // Mais recentes (default)
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (loading || !post) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <p className="text-[13.5px] text-gray-400 font-bold">Carregando detalhes da postagem...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Botão de Voltar */}
      <button 
        onClick={() => navigate('/feed')}
        className="flex items-center gap-1.5 text-[12.5px] font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} /> Voltar para o feed
      </button>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: POST + COMENTÁRIOS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Post Card */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-150">
                  {post.authorAvatar ? (
                    <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[13px] font-bold text-gray-400">{post.authorName[0]}</div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-extrabold text-gray-950">{post.authorName}</span>
                    <span className="text-[9px] bg-violet-100 text-violet-700 font-extrabold px-2 py-0.5 rounded-full uppercase">{post.authorRole}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-light mt-0.5">{perfil?.turma || 'Turma'} • {formatarTempoRelativo(post.created_at)}</p>
                </div>
              </div>

              {post.tipo && <span className="text-[9.5px] bg-violet-100 text-violet-750 font-bold px-2.5 py-0.5 rounded-full">{post.tipo}</span>}
            </div>

            <div className="space-y-2">
              <h3 className="text-[15px] font-extrabold text-gray-900 leading-tight">{post.title}</h3>
              <p className="text-[13px] text-gray-600 font-light leading-relaxed whitespace-pre-line">{post.content}</p>
            </div>

            {post.image_url && (
              <div className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                <img src={post.image_url} alt="" className="w-full object-cover max-h-[360px]" />
              </div>
            )}

            {/* Interaction icons */}
            <div className="flex items-center justify-between border-t border-gray-50 pt-4 pb-1">
              <div className="flex items-center gap-6">
                <button 
                  onClick={handleLikePost}
                  className={`flex items-center gap-1.5 text-[12px] font-bold cursor-pointer transition-colors ${post.usuarioCurtiu ? 'text-red-500' : 'text-gray-450 hover:text-red-500'}`}
                >
                  <Heart size={16} className={post.usuarioCurtiu ? 'fill-red-500 text-red-500' : ''} /> Curtir
                </button>

                <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-450">
                  <MessageCircle size={16} /> {comentarios.length} Comentários
                </div>

                <div className="relative group">
                  <button className="flex items-center gap-1.5 text-[12px] font-bold text-gray-450 hover:text-violet-600 cursor-pointer">
                    <Share2 size={16} /> Compartilhar
                  </button>
                  <div className="absolute left-0 bottom-full mb-2 bg-white border border-gray-150 rounded-xl p-2 hidden group-hover:block shadow-lg z-20 w-44 space-y-1">
                    <button onClick={() => handleCompartilhar('perfil')} className="w-full text-left p-1.5 hover:bg-gray-50 text-[11px] font-bold text-gray-700 rounded-lg">No meu perfil</button>
                    <button onClick={() => handleCompartilhar('destaques')} className="w-full text-left p-1.5 hover:bg-gray-50 text-[11px] font-bold text-gray-700 rounded-lg">Área de destaques</button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <div className="flex -space-x-1.5 overflow-hidden mr-1">
                  {pessoasQueCurtiram.slice(0, 3).map(p => (
                    <div key={p.id} className="w-5 h-5 rounded-full border border-white bg-gray-100 overflow-hidden shadow-sm flex-shrink-0">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px]">{p.nome[0]}</div>}
                    </div>
                  ))}
                </div>
                <span>Você, Lucas e outras {post.likesCount} pessoas curtiram</span>
              </div>
            </div>
          </div>

          {/* Seção Comentários */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-[14px] font-black text-gray-900">Comentários ({comentarios.length})</h3>
              
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value)}
                className="bg-white border border-gray-250 rounded-xl px-2.5 py-1 text-[11px] font-bold text-gray-700 outline-none cursor-pointer"
              >
                <option value="mais_recentes">Mais recentes</option>
                <option value="mais_antigos">Mais antigos</option>
                <option value="mais_curtidos">Mais curtidos</option>
              </select>
            </div>

            {/* Caixa de Texto de Envio */}
            <form onSubmit={handleAdicionarComentario} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-150 overflow-hidden flex-shrink-0">
                {perfil?.avatar_url ? <img src={perfil.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{perfil?.nome ? perfil.nome[0] : 'U'}</div>}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-250 rounded-xl px-4 py-2 focus-within:border-black transition-all">
                  <input 
                    type="text" 
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value)}
                    placeholder="Escreva um comentário..."
                    className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-gray-800 placeholder-gray-400"
                  />
                  
                  <button 
                    type="button" 
                    onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                    className="text-gray-400 hover:text-gray-750 cursor-pointer p-1"
                  >
                    <Smile size={16} />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => {
                      const fileUrl = window.prompt('URL do arquivo anexo (simulado):');
                      if (fileUrl) {
                        const filename = fileUrl.split('/').pop() || 'Arquivo';
                        setAnexosList(prev => [...prev, { filename, file_url: fileUrl, size: '2.4 MB' }]);
                      }
                    }}
                    className="text-gray-400 hover:text-gray-750 cursor-pointer p-1"
                  >
                    <Paperclip size={16} />
                  </button>
                </div>

                {/* Exibição dos anexos prontos para enviar */}
                {anexosList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {anexosList.map((a, idx) => (
                      <span key={idx} className="text-[10px] bg-violet-50 text-violet-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <FileText size={10} /> {a.filename}
                        <button type="button" onClick={() => setAnexosList(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}

                {emojiPickerOpen && (
                  <div className="flex gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl max-w-xs justify-center flex-wrap select-none animate-in zoom-in-95 duration-200">
                    {['😊', '😂', '👍', '🔥', '❤️', '👏', '🎉', '💡', '📚', '🌱'].map(emoji => (
                      <span 
                        key={emoji} 
                        onClick={() => {
                          setNovoComentario(prev => prev + emoji);
                          setEmojiPickerOpen(false);
                        }}
                        className="cursor-pointer hover:scale-125 transition-transform text-lg"
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="bg-violet-650 hover:bg-violet-750 text-white font-bold text-[12px] px-5 rounded-xl cursor-pointer self-start h-10 shadow-sm transition-all"
              >
                Publicar
              </button>
            </form>

            {/* Lista dos Comentários */}
            <div className="divide-y divide-gray-50 space-y-6">
              {comentariosOrdenados.map(c => {
                const autorName = getAutorNome(c.user_id);
                const autorAvatar = getAutorAvatar(c.user_id);
                const autorRole = getAutorRole(c.user_id);
                const replies = respostas.filter(r => r.comment_id === c.id);
                const likesCount = curtidasComentarios.filter(l => l.comment_id === c.id).length;
                const curtiuComentario = usuario ? curtidasComentarios.some(l => l.comment_id === c.id && l.user_id === usuario.id) : false;

                return (
                  <div key={c.id} className="pt-4 space-y-4">
                    
                    {/* Comentário Item */}
                    <div className="flex gap-3 text-[13px] relative group">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {autorAvatar ? <img src={autorAvatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{autorName[0]}</div>}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-950">{autorName}</span>
                          <span className="text-[9px] text-gray-400 font-light">{formatarTempoRelativo(c.created_at)}</span>
                        </div>

                        {editandoCommentId === c.id ? (
                          <div className="space-y-2">
                            <input 
                              type="text" 
                              value={textoEdicao}
                              onChange={(e) => setTextoEdicao(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-250 rounded-xl px-3 py-1.5 text-[12.5px] outline-none"
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={async () => {
                                  await supabase.from('comments').update({ content: textoEdicao }).eq('id', c.id);
                                  setEditandoCommentId(null);
                                  carregarPostCompleto();
                                }}
                                className="text-[10px] bg-violet-600 text-white font-bold px-3 py-1 rounded-lg"
                              >
                                Salvar
                              </button>
                              <button onClick={() => setEditandoCommentId(null)} className="text-[10px] bg-gray-250 text-gray-600 font-bold px-3 py-1 rounded-lg">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-650 font-light leading-relaxed">{c.content}</p>
                        )}

                        <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400 pt-1">
                          <button 
                            onClick={() => handleLikeComentario(c.id)}
                            className={`hover:text-red-500 flex items-center gap-0.5 cursor-pointer ${curtiuComentario ? 'text-red-500' : ''}`}
                          >
                            <Heart size={11} className={curtiuComentario ? 'fill-red-500 text-red-500' : ''} /> {likesCount}
                          </button>
                          
                          <button 
                            onClick={() => setRespostaAtivaCommentId(prev => prev === c.id ? null : c.id)}
                            className="hover:text-gray-700 cursor-pointer"
                          >
                            Responder
                          </button>

                          {(c.user_id === usuario.id) && (
                            <button 
                              onClick={() => {
                                setEditandoCommentId(c.id);
                                setTextoEdicao(c.content);
                              }}
                              className="hover:text-violet-650 cursor-pointer"
                            >
                              Editar
                            </button>
                          )}

                          {(c.user_id === usuario.id || ehProfessor()) && (
                            <button 
                              onClick={() => handleExcluirComentario(c.id, c.user_id)}
                              className="hover:text-red-650 cursor-pointer"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Resposta Envio Box */}
                    {respostaAtivaCommentId === c.id && (
                      <form onSubmit={(e) => handleAdicionarResposta(e, c.id)} className="ml-11 flex gap-3">
                        <input 
                          type="text"
                          value={novaRespostaText}
                          onChange={(e) => setNovaRespostaText(e.target.value)}
                          placeholder="Responder..."
                          className="flex-1 bg-gray-50 border border-gray-250 rounded-xl px-3 py-1.5 text-[12px] outline-none"
                        />
                        <button type="submit" className="bg-violet-600 hover:bg-violet-750 text-white font-bold text-[11px] px-4 rounded-xl cursor-pointer">
                          Enviar
                        </button>
                      </form>
                    )}

                    {/* Respostas List (Threads) */}
                    <div className="ml-11 space-y-4 border-l border-gray-100 pl-4">
                      {replies.map(reply => {
                        const rName = getAutorNome(reply.user_id);
                        const rAvatar = getAutorAvatar(reply.user_id);
                        const rLikesCount = curtidasRespostas.filter(l => l.reply_id === reply.id).length;
                        const curtiuResposta = usuario ? curtidasRespostas.some(l => l.reply_id === reply.id && l.user_id === usuario.id) : false;

                        return (
                          <div key={reply.id} className="flex gap-2.5 text-[12px] relative group">
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-150 flex-shrink-0">
                              {rAvatar ? <img src={rAvatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{rName[0]}</div>}
                            </div>
                            <div className="flex-1 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-gray-900">{rName}</span>
                                <span className="text-[9px] text-gray-400 font-light">{formatarTempoRelativo(reply.created_at)}</span>
                              </div>
                              <p className="text-gray-650 font-light leading-relaxed">{reply.content}</p>

                              <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 pt-0.5">
                                <button 
                                  onClick={async () => {
                                    if (curtiuResposta) {
                                      await supabase.from('reply_likes').delete().eq('reply_id', reply.id).eq('user_id', usuario.id);
                                    } else {
                                      await supabase.from('reply_likes').insert({ reply_id: reply.id, user_id: usuario.id });
                                    }
                                    carregarPostCompleto();
                                  }}
                                  className={`hover:text-red-500 flex items-center gap-0.5 cursor-pointer ${curtiuResposta ? 'text-red-500' : ''}`}
                                >
                                  <Heart size={9} className={curtiuResposta ? 'fill-red-500 text-red-500' : ''} /> {rLikesCount}
                                </button>

                                {(reply.user_id === usuario.id || ehProfessor()) && (
                                  <button 
                                    onClick={async () => {
                                      if (!window.confirm('Excluir resposta?')) return;
                                      await supabase.from('comment_replies').delete().eq('id', reply.id);
                                      carregarPostCompleto();
                                    }}
                                    className="hover:text-red-650 cursor-pointer"
                                  >
                                    Excluir
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}

              {comentarios.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-[12.5px] italic">Sem comentários recentes. Seja o primeiro a opinar!</div>
              )}
            </div>

          </div>

        </div>

        {/* COLUNA DIREITA: INFORMAÇÕES DA POSTAGEM & OUTROS */}
        <div className="space-y-6">
          
          {/* Informações da Postagem */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Informações da postagem</h3>
            
            <div className="space-y-3 text-[12px] font-medium text-gray-500">
              <div className="flex justify-between">
                <span>Turma</span>
                <span className="font-bold text-gray-900">{perfil?.turma || '1º Ano A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tipo de conteúdo</span>
                <span className="font-bold text-gray-900">{post.tipo || 'Geral'}</span>
              </div>
              <div className="flex justify-between">
                <span>Publicado em</span>
                <span className="font-bold text-gray-900">{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-gray-50">
                <span>Autor</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 border">
                    {post.authorAvatar && <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="font-bold text-gray-900">{post.authorName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interações */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Interações</h3>
            <div className="flex items-center gap-6 text-[13px]">
              <span className="flex items-center gap-1.5 text-gray-600"><Heart size={15} className="fill-red-500 text-red-500" /> {post.likesCount}</span>
              <span className="flex items-center gap-1.5 text-gray-600"><MessageCircle size={15} /> {comentarios.length}</span>
              <span className="flex items-center gap-1.5 text-gray-600"><Share2 size={15} /> {compartilhamentosCount}</span>
            </div>
          </div>

          {/* Pessoas que curtiram */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Pessoas que curtiram</h3>
            
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 overflow-hidden">
                {pessoasQueCurtiram.slice(0, 4).map(p => (
                  <div key={p.id} className="w-6 h-6 rounded-full border border-white bg-gray-200 overflow-hidden shadow-sm flex-shrink-0">
                    {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">{p.nome[0]}</div>}
                  </div>
                ))}
              </div>
              {pessoasQueCurtiram.length > 4 && (
                <span className="text-[11px] font-bold text-gray-500">+{pessoasQueCurtiram.length - 4}</span>
              )}
            </div>
          </div>

          {/* Arquivos anexados */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Arquivos anexados</h3>
            
            <div className="space-y-3">
              {comentarios.filter(c => c.attachments && JSON.parse(c.attachments).length > 0).map(c => {
                const files = JSON.parse(c.attachments);
                return files.map((f, idx) => (
                  <a 
                    key={idx} 
                    href={f.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText size={14} />
                    </div>
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-gray-850 block truncate max-w-[150px]">{f.filename}</span>
                      <span className="text-[9.5px] text-gray-450 block mt-0.5">{f.size || '---'}</span>
                    </div>
                  </a>
                ));
              })}
              {comentarios.filter(c => c.attachments && JSON.parse(c.attachments).length > 0).length === 0 && (
                <p className="text-[11px] text-gray-400 font-light">Nenhum arquivo anexado nesta discussão.</p>
              )}
            </div>
          </div>

          {/* Hashtags */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Hashtags</h3>
            <div className="flex flex-wrap gap-2">
              {['#sustentabilidade', '#projeto', '#meioambiente', '#estudo'].map(tag => (
                <span key={tag} className="text-[10px] bg-violet-50 text-violet-700 font-extrabold px-2 py-0.5 rounded-full select-all">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Regras da Comunidade */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-3.5">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Regras da comunidade</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed font-light">Seja respeitoso e contribua de forma positiva.</p>
            <button 
              onClick={() => toast.info('Regras da comunidade: Seja construtivo, evite palavreado abusivo e preserve o ambiente educacional.')}
              className="w-full text-center py-2 text-[11px] font-bold text-violet-650 hover:bg-gray-50 border border-gray-200 rounded-xl cursor-pointer"
            >
              Ver todas as regras
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
